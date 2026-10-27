import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const icon = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
  await icon.goto(pathToFileURL(resolve('build/icon.svg')).href)
  await icon.screenshot({
    path: resolve('build/icon.png'),
    omitBackground: true
  })

  const tray = await browser.newPage({ viewport: { width: 36, height: 36 } })
  await tray.setContent(`
    <style>
      html,body{margin:0;background:transparent;display:grid;place-items:center;width:36px;height:36px}
      span{font:700 25px "Songti SC",serif;color:#111;transform:translateY(-1px)}
      i{position:absolute;width:27px;height:11px;border:2px solid #111;border-radius:50%;transform:rotate(-24deg)}
    </style>
    <i></i><span>序</span>
  `)
  await tray.screenshot({
    path: resolve('build/trayTemplate.png'),
    omitBackground: true
  })
} finally {
  await browser.close()
}
