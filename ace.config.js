// @ts-check 

/** @type {import('@acets-team/ace').AceConfig} */
export const config = {
  logCaughtErrors: true,
  origins: {
    local: 'http://localhost:8787'
  },
  plugins: {
    cf: true,
  }
}
