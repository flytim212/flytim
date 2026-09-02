/**
 * equity 计算 Web Worker
 *
 * 消息协议：
 *   主线程 → Worker：{ type: 'run', hole: string[], board: string[], villainRange: GridSelection, iterations: number }
 *   Worker → 主线程：
 *     { type: 'progress', done, total, win, tie, lose, elapsedMs }  对数间隔增量上报
 *     { type: 'done', win, tie, lose, elapsedMs }                    最终结果
 *
 * 牌以字符串（"As" 等）跨线程传递，体积小且结构化克隆开销低。
 */

import { parseCards } from '../core/cards'
import { equity } from '../core/equity'
import type { GridSelection } from '../core/ranges'

interface RunMessage {
  type: 'run'
  hole: string[]
  board: string[]
  villainRange: GridSelection
  iterations: number
}

self.onmessage = (ev: MessageEvent<RunMessage>) => {
  const msg = ev.data
  if (!msg || msg.type !== 'run') return

  try {
    const result = equity(
      parseCards(msg.hole),
      parseCards(msg.board),
      msg.villainRange,
      msg.iterations,
      (p) => {
        self.postMessage({ type: 'progress', ...p })
      },
    )
    self.postMessage({ type: 'done', ...result })
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
