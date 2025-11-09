#!/usr/bin/env node

import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { join, dirname } from 'node:path'
import { cp, mkdir } from 'node:fs/promises'
import { constants, type PathLike } from 'node:fs'
import { access, writeFile } from 'node:fs/promises'
import { cuteLog, cuteString } from './.ace/fundamentals/cuteLog.js'


/**
 * 1. Ensure node version is 22 or higher
 * 1. Ask / receive project name
 * 1. Copy files from project to their directory
 */
async function main() {
  const build = new Build()

  try {
    build.checkNodeVersion()

    await build.setProjectName()
    await build.writeFiles()
    await build.onSuccess()
  } catch (err) {
    build.onCatch(err)
  }
}


class Build {
  template = ''
  projectName = ''


  #renderPackageDotJson() {
    return {
      name: this.projectName,
      type: 'module',
      version: '0.0.1',
      engines: {
        node: '>=22'
      },
      scripts: {
        bump: 'ace build local',
        'cf-typegen': 'wrangler types',
        dev: 'ace build local && wrangler dev',
        "dev-fresh": 'rm -rf .ace && npm run dev',
        build: 'ace build prod && wrangler build',
        typesafe: 'tsc --project tsconfig.typesafe.json',
      },
      devDependencies: {
        '@acets-team/ace': '^0.8.1',
        "@types/node": "^24.10.0",
        typescript: "^5.9.3",
        wrangler: "^4.46.0"
      }
    }
  }


  async writeFiles() {
    // get bearings
    const cwd = process.cwd()
    const newProjectDir = join(cwd, this.projectName)
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
  
    // create project name dir
    await mkdir(newProjectDir, { recursive: true }) 

    // write src folder
    await mkdir(join(newProjectDir, 'src'))

    // read + write files that go right into root folder
    const writePromises = [ 'ace.config.js', 'tsconfig.json', 'tsconfig.typesafe.json' ].map(file =>
      cp(join(__dirname, file), join(newProjectDir, file))
    )

    // write the package.json, .env & the files that go into the src & public folders
    writePromises.push(
      cp(join(__dirname, 'src'), join(newProjectDir, 'src'), { recursive: true }),
      writeFile(join(newProjectDir, '.env'), this.#renderDotEnv(), 'utf8'),
      writeFile(join(newProjectDir, 'package.json'), JSON.stringify(this.#renderPackageDotJson(), null, 2), 'utf8'),
      writeFile(join(newProjectDir, '.gitignore'), this.#renderGitIgnore(), 'utf8'),
      writeFile(join(newProjectDir, 'wrangler.jsonc'), this.#renderWranglerJsonc(), 'utf8'),
    )

    await Promise.all(writePromises)
  }


  #renderDotEnv() {
    return `LIVE_SECRET=${ randomBytes(64).toString('base64') }

# npx wrangler secret put
`
  }



  checkNodeVersion() {
    const current = parseInt(process.versions.node.split('.')[0], 10)
  
    if (current < 22) {
      console.error(cuteString(`❌ Node.js 22+ is required. You're using ${process.version}`, 'red'))
      process.exit(1)
    }
  }


  async setProjectName() {
    console.clear()

    cuteLog('Welcome to Ace Live Server!', 'bold', 'underline')

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const question = (q: string) => new Promise<string>((resolve) => rl.question(q, (answer) => resolve(answer.trim())))

    while (true) {
      const projectName = await question(cuteString('🛠️ Project Name Please: ', 'cyan'))

      if (!projectName) cuteLog('⚠️ Project name cannot be empty', 'red')
      else if (/[/\\?%*:|"<>]/.test(projectName)) cuteLog('⚠️ Project name contains invalid folder characters', 'red')
      else if (await pathExists(projectName)) cuteLog(`⚠️ A folder named "${projectName}" already exists. Please choose a different name.`, 'red')
      else {
        this.projectName = projectName
        break
      }
    }

    rl.close()
  }


  async onSuccess() {
    console.log(`
${cuteString(`🎉 Congratulations! "${this.projectName}" created! 🎉`, 'green', 'bold', 'underline')}

${cuteString('🤓 4 quick steps to dev please:', 'blue', 'bold')}

   ${cuteString('1)', 'blue')} ${cuteString('cd ' + this.projectName, 'cyan')}
   ${cuteString('2)', 'blue')} ${cuteString('npm install', 'cyan')}
   ${cuteString('3)', 'blue') } ${cuteString('npm run cf-typegen', 'cyan')}
   ${cuteString('4)', 'blue')} ${cuteString('npm run dev', 'cyan')}

${cuteString('💖 Thanks for creating w/ Ace! ✨ Docs: https://github.com/acets-team/ace\n', 'bold')}`)
  }


  /**
   * @param {unknown} err
   */
  onCatch(err: unknown) {
    console.error(err)
    process.exit(1)
  }


  #renderGitIgnore() {
    return `.env
dist
node_modules
.wrangler
worker-configuration.d.ts
`
  }


  #renderWranglerJsonc() {
    return `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "${this.projectName}",
  "main": "src/index.ts",
  "compatibility_date": "${getWranglerCompatabilityDate()}",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "observability": {
    "enabled": true
  },
	"migrations": [
		{
			"new_sqlite_classes": [
				"LiveDurableObject"
			],
			"tag": "v1"
		}
	],
	"durable_objects": {
		"bindings": [
			{
				"class_name": "LiveDurableObject",
				"name": "LIVE_DURABLE_OBJECT"
			}
		]
	}
}
`
  }
}


main()


async function pathExists(path: PathLike): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}


/**
 * 1) Get the current utc date
 * 2) Subtract 3 days
 * 3) Give back in the format "2025-01-30" aka Year-Month-Day
 */
function getWranglerCompatabilityDate(): string {
  const now = new Date()
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  utcDate.setUTCDate(utcDate.getUTCDate() - 3)

  const year = utcDate.getUTCFullYear()
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}