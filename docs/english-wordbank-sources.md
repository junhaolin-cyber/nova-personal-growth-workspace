# LIN 英语词库来源与构建记录

## 当前构建

- 构建日期：2026-10-26
- 词库结果：72 条既有词条 + 4,108 条生成词条 = 4,180 条
- 生成命令：`node scripts/english/build-word-bank.mjs --source-dir=<local-cache>`
- 生成文件：`features/english/wordBank.generated.ts`
- 词条 ID：`word-bank-${sha256(lowercase(word) + "|" + lowercase(partOfSpeech)).slice(0, 16)}`。ID 不依赖词库排序，且既有 `word-001` 至 `word-072` 不变。
- 运行时不请求词典或例句服务。生成文件是静态本地数据；生成失败时不会覆盖现有生成文件，页面仍使用仓库中上一次的生成文件，并且既有 72 条词库保留为本地安全基础。

## 来源、版本、许可证与哈希

哈希均为下载文件的 SHA-256。原始下载文件没有提交到仓库；生成结果和本记录提交，便于复核与重建。

| 用途 | 来源与版本 | 官方来源 / 下载地址 | 许可证与署名 | SHA-256 |
| --- | --- | --- | --- | --- |
| 高频排序 | NGSL 1.2 | [New General Service List](https://www.newgeneralservicelist.org/) | CC BY-SA 4.0；再分发需保留署名与同许可要求 | `2098BAB8955A120A9766C6282A51D7D578C6CB0A7D946600D2FFB73BA25A0B44`（`NGSL_12_stats.csv`） |
| 扩展候选排序 | NGSL-GR 1.0 | [New General Service List](https://www.newgeneralservicelist.org/) | CC BY-SA 4.0；再分发需保留署名与同许可要求 | `5C4F7BB84B5D74D7481D43483B811F1591BD667B86A6131F1566FDF07CADE91E`（`NGSL-GR_rank.csv`） |
| 英文释义 | NGSL 1.2 English definitions | [New General Service List](https://www.newgeneralservicelist.org/) | CC BY-SA 4.0；与 NGSL 署名一起保留 | `27F8BB4E0948719FFEF01A42DE0F9E01089B78A12BD576B480D5F14DF5E3341C`（`NGSL_12_with_English_definitions.xlsx`） |
| 中文释义、备用英文释义、词性、备用音标 | ECDICT，固定提交 `ab22ad36302cafc6349a050e2b60894855208055` | [ECDICT](https://github.com/skywind3000/ECDICT/tree/ab22ad36302cafc6349a050e2b60894855208055) | MIT；保留项目版权与许可证声明 | `D1ECBDF9EE2B920AFB6F430CA6B6BB9F559588CF0DFF86E04BD255F9390843CC`（`ecdict.csv`） |
| 美式音标 | IPA-Dict，固定提交 `972cd67dd5f96bc5660e28070cde26e3928abcd7` | [IPA-Dict](https://github.com/open-dict-data/ipa-dict/tree/972cd67dd5f96bc5660e28070cde26e3928abcd7) | MIT；保留项目版权与许可证声明 | `2AF6F154A5C363275F052D1F85ACEDEF38ED185CA9745AA4314BE77F6B70DE67`（`en_US.txt`） |
| 英中例句 | Tatoeba 2026-10-24 下载快照 | [Tatoeba downloads](https://tatoeba.org/en/downloads) | 英文/中文句子按 Tatoeba 数据许可分发：CC BY 2.0 FR，部分贡献为 CC0；应用保留 Tatoeba 署名 | 英文 `F634EAAF26623C2A2E170BE2DAE54B18388479311AE8619D04889DF4E5D021F3`（`eng_sentences.tsv`）；中文 `EDF090F0E0A043792E379560DDB56816757BAA3DC99541FDCA999C83B98A47EE`（`cmn_sentences.tsv`）；链接 `F180BCDF64DE8FB41BA1E8275B7601C14ED820CB64430867B4FF491B01C13789`（`links.csv`） |
| 备用英文释义与词性 | Open English WordNet 2025 Edition，固定提交 `dc343f2683279ecbb13fab4e2fd778d7b162d287` | [English WordNet](https://github.com/globalwordnet/english-wordnet/tree/dc343f2683279ecbb13fab4e2fd778d7b162d287) | CC BY 4.0；保留署名 | `09F8DE8C640E461A8E7C57E916FB27FA5A6274EC9C723067A51FC85AA7AD8FBD`（ZIP） |

NGSL / NGSL-GR 是候选和频率排序来源，不直接假设每个候选都拥有完整教学字段。Kaikki/Wiktionary 已核验为可用的开放数据方向，但本次没有把约 3.2 GB JSONL 打包进应用，避免引入无法在本地完整审核的巨大运行时资产。

## 字段构建与质量门槛

每条生成词必须同时通过以下检查，否则不进入发布词库：

- 单词是英语字母词（允许内部连字符或撇号），且来自 NGSL 1.2 与 NGSL-GR 1.0 合并候选。
- 中文释义来自 ECDICT；英文释义优先使用 NGSL 官方释义，其次使用 ECDICT，最后才使用 OEWN 备用释义。
- 音标优先使用 IPA-Dict，缺失时使用 ECDICT；缺少音标直接排除。
- 词性必须能映射到现有中文 UI 词性字段；缺失直接排除。
- 英文例句和中文对应翻译必须来自同一 Tatoeba 链接，长度与字符安全检查通过后才接受；缺失任一项直接排除。
- `collocations` 和 `topic` 使用现有类型允许的空数组与默认分类“通用”，不伪造搭配或主题。
- 与既有 72 个单词重复的词，以及重复 ID 或重复单词/词性组合，直接排除。

本次 5,050 个合并候选中通过 4,108 条；排除 69 条既有词重复、3 条缺词性、870 条缺合格英中例句，其余必需字段缺失数为 0。

## 页面性能与失败策略

生成词库不再静态塞进全局共享客户端 chunk。`features/english/wordBank.ts` 使用动态 import 加载生成词库，加载失败时返回既有 72 条本地词库；`AppShell` 也只在进入英语模块时按需加载英语页面。运行时不请求第三方服务，因此词典服务不可用不会导致页面白屏，也不改变 Local Storage key 或结构。

本次 Production Build（未压缩静态产物）实测：

- 72 条基线：全站静态 chunk 1,718,339 bytes；首页 First Load JS 约 352 kB。
- 直接把 4,180 条词库放进共享 chunk：全站静态 chunk 3,251,506 bytes；首页 First Load JS 约 830 kB。
- 最终按需加载方案：全站静态 chunk 3,806,127 bytes；首页 First Load JS 约 326 kB；英语页面 chunk 532,562 bytes；生成词库按需 chunk 2,083,558 bytes。

因此新增词库会增加英语模块的按需资源，但不会增加全局首屏词库负担。未来若英语页面自身仍需继续优化，可在不改变 ID 或用户数据的前提下把生成词库按频率拆成更多静态块。
