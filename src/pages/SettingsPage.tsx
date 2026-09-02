/** 设置页（阶段 1 占位：说明数据存储方式） */
export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-gold tracking-wide">设置</h1>
        <p className="text-xs text-stone-400 mt-1">当前为阶段 1 版本，设置项将随后续版本提供</p>
      </header>

      <section className="card-panel p-4 space-y-3 text-sm text-stone-300">
        <div>
          <h2 className="font-bold text-gold-light">数据存储</h2>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed">
            本应用为纯单机离线工具，所有训练数据（当日统计等）仅保存在本设备的浏览器 localStorage 中，
            不上传、不联网、不关联任何账号。
          </p>
        </div>
        <div>
          <h2 className="font-bold text-gold-light">合规说明</h2>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed">
            本软件为纯单机训练工具，不涉及任何真实金钱对局，仅用于策略学习。
            界面中的筹码均为虚拟筹码，仅作训练计数使用。
          </p>
        </div>
      </section>
    </div>
  )
}
