/** 13×13 范围网格预览（169 格制：对角线口袋对、上三角同花、下三角不同花） */
import { GridSelection } from '../core/ranges'

interface RangeGridProps {
  selection: GridSelection
  /** 格子点击（预览模式下可省略） */
  onCellClick?: (i: number, j: number) => void
}

const LABELS = 'AKQJT98765432'

export default function RangeGrid({ selection, onCellClick }: RangeGridProps) {
  const cells: JSX.Element[] = []
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const key = `${i},${j}`
      const on = (selection[key] ?? 0) > 0
      const label =
        i === j ? LABELS[i] + LABELS[i] : i < j ? LABELS[i] + LABELS[j] : LABELS[j] + LABELS[i] + 'o'
      cells.push(
        <button
          key={key}
          type="button"
          className={`range-cell ${i === j ? 'pair' : ''} ${on ? 'on' : ''}`}
          onClick={onCellClick ? () => onCellClick(i, j) : undefined}
          aria-label={label}
        >
          {label}
        </button>,
      )
    }
  }
  return <div className="range-grid select-none">{cells}</div>
}
