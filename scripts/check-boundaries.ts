import ts from 'typescript'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
const root = process.cwd()
const rootPackage = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const browserOnly = new Set(['domain', 'contracts', 'ui', 'desktop-bridge'])
let errors: string[] = []
async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const nested = await Promise.all(
    entries
      .filter(
        (entry) => !['node_modules', 'target', 'dist', '.output', '.nitro'].includes(entry.name),
      )
      .map((entry) =>
        entry.isDirectory()
          ? walk(join(directory, entry.name))
          : /\.[cm]?tsx?$/.test(entry.name)
            ? [join(directory, entry.name)]
            : [],
      ),
  )
  return nested.flat()
}
for (const group of ['apps', 'packages']) {
  for (const name of await readdir(join(root, group))) {
    const directory = join(root, group, name)
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    const declared = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    }
    for (const file of await walk(directory)) {
      if (file.endsWith('routeTree.gen.ts')) continue
      const code = await readFile(file, 'utf8')
      const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
      const isTest = /\.(test|spec)\./.test(file)
      const client =
        (group === 'packages' && browserOnly.has(name)) ||
        (group === 'apps' && file.includes('/src/') && !file.endsWith('/server.ts')) ||
        file.endsWith('/rpc/src/client.ts') ||
        file.endsWith('/auth/src/client.ts')
      const visit = (node: ts.Node) => {
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const spec = node.moduleSpecifier.text
          const typeOnly = ts.isImportDeclaration(node)
            ? node.importClause?.isTypeOnly
            : node.isTypeOnly
          if (!typeOnly) {
            if (
              client &&
              !isTest &&
              (/^(node:|pg$|drizzle-orm|@aws-sdk|evlog$|nitro$)/.test(spec) ||
                /^@voidmix\/(db|storage|jobs|config\/server)$/.test(spec) ||
                spec === '@voidmix/auth')
            )
              errors.push(`${relative(root, file)}: server runtime import ${spec}`)
            if (spec.startsWith('.')) {
              const target = resolve(dirname(file), spec)
              if (group === 'packages' && !target.startsWith(directory + '/'))
                errors.push(
                  `${relative(root, file)}: use a declared workspace export instead of ${spec}`,
                )
            } else {
              const pkg = spec.startsWith('@')
                ? spec.split('/').slice(0, 2).join('/')
                : spec.split('/')[0]
              if (
                !spec.startsWith('node:') &&
                pkg !== manifest.name &&
                !declared[pkg] &&
                !rootPackage.devDependencies?.[pkg]
              )
                errors.push(`${relative(root, file)}: undeclared dependency ${pkg}`)
            }
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
}
if (errors.length) throw new Error(errors.join('\n'))
console.info('Workspace import boundaries passed')
