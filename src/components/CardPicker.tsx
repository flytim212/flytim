/**
 * 选牌面板（底部抽屉）：52 张牌 4 行 × 13 列
 * 已被占用的牌置灰禁用；选择后回调并关闭
 */
import { Card, RANK_CHARS, SUIT_COLORS, SUIT_SYMBOLS, cardToString } from '../core/cards'

interface CardPickerProps {
  /** 不可选的牌（字符串形式，如 "As"） */
  disabled: Set<string>
  onPick: (card: Card) => void
  /** 清除该牌位（可空） */
  onClear?: () => void
  onClose: () => void
  title?: string
}

const SUITS = ['s', 'h', 'd', 'c'] as const
const RANK_DISPLAY = 'AKQJT98765432'

export default function CardPicker({ disabled, onPick, onClear, onClose, title = '选择一张牌' }: CardPickerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-label={title}
    >
      <div
        className="card-panel !rounded-b-none px-3 pt-4 pb-5 bg-felt-deep/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm font-bold text-gold">{title}</span>
          {onClear && (
            <button
              type="button"
              className="text-xs text-stone-300 border border-stone-500/60 rounded-lg px-3 min-h-[36px]"
              onClick={onClear}
            >
              清除该牌位
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {SUITS.map((s) => (
            <div key={s} className="grid grid-cols-13" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
              {RANK_DISPLAY.split('').map((rc) => {
                const str = rc + s
                const off = disabled.has(str)
                const red = SUIT_COLORS[s] === 'red'
                return (
                  <button
                    key={str}
                    type="button"
                    disabled={off}
                    onClick={() => onPick({ r: RANK_CHARS.indexOf(rc) + 2, s })}
                    className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[13px] font-bold leading-none transition-colors ${
                      off
                        ? 'text-stone-600 bg-black/30 cursor-not-allowed'
                        : red
                          ? 'text-red-400 bg-white/90 hover:bg-white active:bg-gold-light'
                          : 'text-stone-900 bg-white/90 hover:bg-white active:bg-gold-light'
                    }`}
                    aria-label={str}
                  >
                    <span>{rc}</span>
                    <span className="text-[11px]">{SUIT_SYMBOLS[s]}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn-gold w-full mt-4 text-sm"
          onClick={onClose}
        >
          关闭
        </button>
      </div>
    </div>
  )
}

/** 便捷：把 Card 数组转为禁用字符串集合 */
export function toDisabledStrings(cards: (Card | null)[]): Set<string> {
  const s = new Set<string>()
  for (const c of cards) if (c) s.add(cardToString(c))
  return s
}
