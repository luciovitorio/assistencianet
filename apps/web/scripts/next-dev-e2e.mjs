import dotenv from 'dotenv'

dotenv.config({ path: '.env.test', override: true })

process.argv = [
  process.argv[0],
  import.meta.resolve('next/dist/bin/next'),
  'dev',
  '-p',
  '3001',
]

await import('next/dist/bin/next')
