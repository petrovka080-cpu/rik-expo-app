# T1.1 Render vs Source Diff

Selected slice: `app/pdf-viewer.tsx`.

The corrupted text was already present in the React Native source literals. No DB, SQL, RPC, JSON serialization, or PDF font layer was required to reproduce it.

| Field | Before | After | Corruption Point |
| --- | --- | --- | --- |
| loading label | РћС‚РєСЂС‹РІР°РµС‚СЃСЏ... | Открывается... | hardcoded RN Text/source literal |
| native handoff title | Р”РѕРєСѓРјРµРЅС‚ РѕС‚РєСЂС‹С‚ РІРѕ РІРЅРµС€РЅРµРј PDF-РїСЂРёР»РѕР¶РµРЅРёРё | Документ открыт во внешнем PDF-приложении | hardcoded RN Text/source literal |
| native handoff action | РћС‚РєСЂС‹С‚СЊ РµС‰С‘ СЂР°Р· | Открыть ещё раз | hardcoded RN Text/source literal |
| share action | РџРѕРґРµР»РёС‚СЊСЃСЏ | Поделиться | hardcoded RN Text/source literal |
| page indicator pending glyph | вЂ¦ | … | hardcoded RN Text/source literal |

Source-to-render parity for this slice is direct: the RN `<Text>`/prop literals render the same strings that are present in source.
