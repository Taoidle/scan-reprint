// A viewport resize can briefly leave Electron/Xvfb without a composited surface.
// Retry only this read-only protocol failure, never application actions/assertions.
export async function capture(page,path){
  for(let attempt=1;attempt<=3;attempt++){
    await page.evaluate(()=>new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve))));
    try{await page.screenshot({path,fullPage:true});return;}
    catch(error){if(attempt===3||!String(error).includes('Unable to capture screenshot'))throw error;console.warn(`Electron screenshot surface not ready (${attempt}/3); waiting for repaint`);}
  }
}
