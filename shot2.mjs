import { chromium } from 'playwright'
const base='http://localhost:4179'
const b=await chromium.launch()
async function shot(file,w,h,full){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2})
  const p=await ctx.newPage(); await p.goto(base+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(900)
  await p.screenshot({path:file,fullPage:!!full}); console.log(file); await ctx.close()
}
await shot('/tmp/land-d-top.png',1366,900,false)
await shot('/tmp/land-d-full.png',1366,900,true)
await shot('/tmp/land-m-full.png',390,844,true)
await b.close()
