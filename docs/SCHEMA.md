# 数据契约规范 (SCHEMA)

> **这是写死的契约。** 取数方式（Fetch provider）和存储位置（Storage provider）都可以由
> 用户替换，但本文件定义的格式是所有实现必须遵守的硬约束。渲染层**只依赖本契约**，
> 不关心数据来自哪、存在哪。
>
> 契约分四块：① 存储文档 ② Provider 输出 ③ Storage 接口 ④ Render 接口。
> 修改本文件 = 修改契约,必须同步 `SCHEMA_VERSION` 并提供迁移。

当前 `SCHEMA_VERSION = 2`。

---

## ① 存储文档（Storage Document）—— 落盘/存储的唯一真实格式

无论存在 `chrome.storage.local`、Google Drive 还是 GitHub `citations.json`，内容都是这个对象：

```jsonc
{
  "schema": 2,                          // 整数，必填；渲染层据此选解析路径
  "profile": {
    "scholar_id": "AbCdEfGhIjK",       // 必填
    "name": "marsggbo",                 // 可选
    "url": "https://scholar.google.com/citations?user=AbCdEfGhIjK",
    "metrics": {                        // 权威总量，取自 Scholar 指标框（分页也正确）
      "2026-07-19": { "citations": 3696, "hindex": 30, "i10": 55 }
    }
  },
  "updated": "2026-07-19",              // 最近一次写入日期 (YYYY-MM-DD, 本地时区)
  "source": "dom",                      // 最近一次取数来源: dom|scraperapi|serpapi|proxy|llm
  "papers": {
    // key = 论文标题（规范化后，见 §去重规则）
    "AutoML: A survey of the state-of-the-art": {
      "year": "2021",                   // 字符串，可空
      "pub_id": "AbCdEfGhIjK:xxx",     // Scholar citation_for_view id，可空，用于去重/详情
      "first_seen": "2026-04-04",       // 首次被记录的日期 → 前端 NEW 徽章
      "history": {                      // 必填。date(YYYY-MM-DD) -> 引用总数(整数)
        "2026-04-04": 2630,
        "2026-07-19": 2808
      },
      "meta": {                         // 可选，由元数据 provider 补充，全部字段可空
        "authors": ["Xin He", "Kaiyong Zhao", "X. Chu"],
        "venue": "Knowledge-Based Systems",
        "tldr": "…",
        "abstract": "…",
        "arxiv": "1908.00709",
        "doi": "10.1016/j.knosys.2020.106622",
        "s2url": "https://www.semanticscholar.org/paper/…",
        "pdf": "https://arxiv.org/pdf/1908.00709",
        "_tried": "2026-07-19"          // 内部：元数据上次尝试补充的日期（失败重试用）
      }
    }
  }
}
```

**不变量（实现必须保证）：**
- `history` 的 key 全局唯一按日期；同一天只保留一条（幂等，后写覆盖）。
- `citations` 一律非负整数；解析不到记 `0`，不得写 `null`。
- `first_seen` 一经写入不再更改。
- 删除论文要保守：Scholar 偶尔漏掉某篇 ≠ 论文消失，**不因单次抓取缺失就删历史**。
- **总量口径**：全站总引用取 `profile.metrics`（Scholar 指标框），**分页/折叠时也正确**；
  仅当某日期早于任何 metrics 记录时，才回退用各论文 last-known 之和。
- **每篇论文只更新当前页面可见的**：不可见的论文保留历史、当天不更新（增量语义）。
- **多档隔离**：每个 Scholar profile 存成独立文档，本地键 `mpt_doc__<scholar_id>`；
  GitHub 同步只作用于用户的 primary profile —— 不同人的数据永不混在一起。

### 去重规则（key 的规范化）

- 首选用 `pub_id`（若两条 `pub_id` 相同视为同一篇，合并）。
- 无 `pub_id` 时用**规范化标题**作 key：`trim` + 折叠连续空白 + 保留原始大小写展示，但比较时
  `toLowerCase()`。迁移历史数据时以标题为准。

---

## ② Provider 输出（Fetch Provider Result）—— 只负责「今天的快照」

Fetch provider **不碰历史、不碰合并、不碰元数据**，只返回当天抓到的列表。归一化由
Normalizer 负责，把快照合并进 §① 的 `history`。

```jsonc
// ProviderResult
{
  "scholar_id": "AbCdEfGhIjK",
  "fetched_at": "2026-07-19T02:00:00Z",   // ISO8601
  "source": "dom",                        // dom|scraperapi|serpapi|proxy|llm
  "ok": true,
  "papers": [
    { "title": "AutoML…", "citations": 2808, "year": "2021", "pub_id": "AbCdEfGhIjK:xxx" }
  ]
}
// 失败时: { "ok": false, "error": "captcha" | "network" | "empty", "papers": [] }
```

### Fetch Provider 接口（伪代码）

```ts
interface FetchProvider {
  id: 'dom' | 'scraperapi' | 'serpapi' | 'proxy' | 'llm';
  needsConfig: boolean;                   // 是否需要用户填 key
  fetch(scholarId: string, cfg?: object): Promise<ProviderResult>;
}
```

> DOM provider 是唯一 `needsConfig=false` 的默认实现；它读页面 DOM，无网络请求。

---

## ③ Storage 接口 —— 存哪都行，格式不变

```ts
interface StorageProvider {
  id: 'local' | 'gdrive' | 'github' | 'worker';
  load(): Promise<StorageDocument | null>;   // 读回 §① 文档
  save(doc: StorageDocument): Promise<void>;  // 写入 §① 文档（自带并发/sha 处理）
  exportJSON(): Promise<string>;              // 备份
  importJSON(text: string): Promise<void>;    // 迁移/恢复
}
```

- 默认 `local`（`chrome.storage.local` + `unlimitedStorage`）。
- 可多后端并存（双写）；写入前后都必须是合法的 §① 文档。
- `github` 实现负责 Contents API 的 `sha` 与 409 冲突重试；`gdrive` 用 `appDataFolder`。

---

## ④ Render 接口 —— 渲染层唯一依赖的输入

**渲染层不直接读存储文档**，而是消费 Normalizer 由 §① 派生出的 `RenderModel`。
这样换存储/取数都不影响任何一张图。

```ts
interface RenderModel {
  profile: { scholarId: string; name?: string };
  dates: string[];                 // 全局并集，升序
  totals: number[];                // 与 dates 对齐：每日全站引用总数
  totalDeltas: number[];           // 与 dates 对齐：当日新增（totals 的一阶差分，首日 0）
  papers: RenderPaper[];
  updated: string;
  newCount: number;                // NEW 窗口内新论文数
}

interface RenderPaper {
  title: string;
  year?: string;
  meta: PaperMeta;                 // 见 §① meta（缺省为空对象）
  series: SeriesPoint[];           // 该论文的时间序列
  latest: number;                  // 最新引用
  prev: number;                    // 前一天引用
  firstSeen: string;
  isNew: boolean;                  // firstSeen 在 NEW 窗口内且非首日
  totalGain: number;              // latest - series[0].citations
}

interface SeriesPoint {
  date: string;
  citations: number;
  delta: number;                   // 相对前一点的新增（首点为 null 语义 → 前端显示 "—"）
}
```

**契约要点：**
- `delta` 由 Normalizer 预计算，前端 tooltip 直接显示「日期 / 引用总数 / 当日新增」——
  与现有看板的悬停信息一致。
- `dates`/`totals`/`totalDeltas` 三者等长且对齐,渲染层可直接画。
- 渲染层（无论是扩展 overlay 还是独立看板）**只 import `RenderModel`**，
  一份逻辑两处复用。

---

## 版本与迁移

- 顶层 `schema` 缺失 → 视为 **v1**（现有看板的 `title -> {year, history, first_seen, meta}` 扁平结构）。
- `migrate(v1) -> v2`：包一层 `{schema:2, profile, updated, source, papers:<原对象>}`。
- 渲染层与 Normalizer 都要能读 v1 与 v2（读时归一到 v2 内存结构）。
- 任何破坏性字段变更都要 `SCHEMA_VERSION += 1` 并补迁移；`meta` 内新增可空字段不算破坏性。
