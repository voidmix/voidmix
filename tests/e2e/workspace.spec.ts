import { test, expect } from '@playwright/test'
import { createDatabase } from '../../packages/db/src/index'
const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('E2E requires a disposable TEST_DATABASE_URL ending in _test')
test('sign in, upload, confirm deletion accessibly, sign out and render at mobile width', async ({
  page,
  request,
}) => {
  const email = `browser-${Date.now()}@example.com`
  const password = 'BrowserTestPassword123!'
  const registered = await request.post('/api/auth/sign-up/email', {
    data: { name: 'Browser test', email, password },
    headers: { Origin: 'http://localhost:3000' },
  })
  expect(registered.ok()).toBe(true)
  const database = createDatabase(databaseUrl!)
  let verificationUrl: string
  try {
    const { rows } = await database.pool.query(
      "select payload from jobs where name = 'send-email' and payload->>'to' = $1 order by created_at desc limit 1",
      [email],
    )
    verificationUrl = rows[0].payload.text.match(/https?:\/\/\S+/)[0]
  } finally {
    await database.close()
  }
  await request.get(verificationUrl!)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '登录 Voidmix' })).toBeVisible()
  await page.screenshot({ path: 'test-results/login-desktop.png', fullPage: true })
  await page.getByLabel('邮箱', { exact: true }).fill(email)
  await page.getByLabel('密码', { exact: true }).fill(password)
  await page.getByRole('button', { name: '登录账号', exact: true }).click()
  await expect(page.getByRole('heading', { name: '你的文件' })).toBeVisible()
  await page.getByLabel('选择文件', { exact: true }).setInputFiles({
    name: 'hello.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello voidmix'),
  })
  await expect(page.getByText('文件上传成功', { exact: true })).toBeVisible()
  await expect(page.getByText('hello.txt', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/workspace-mobile.png', fullPage: true })
  const deleteButton = page.getByRole('button', { name: '删除', exact: true })
  await deleteButton.click()
  const dialog = page.getByRole('alertdialog', { name: '删除这份文件？' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: '取消', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: '确认删除', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: '取消', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(deleteButton).toBeFocused()
  await expect(page.getByText('hello.txt', { exact: true })).toBeVisible()

  // A failed DELETE must leave the confirmation open and allow retry.
  await page.route('**/api/files/*', async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue()
    await route.fulfill({ status: 503, json: { error: { message: '暂时无法删除，请重试' } } })
  })
  await deleteButton.click()
  await dialog.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('暂时无法删除，请重试')
  await page.screenshot({ path: 'test-results/delete-mobile.png', fullPage: true })
  await page.unroute('**/api/files/*')
  await dialog.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('文件已加入删除队列', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '你的文件' })).toBeFocused()
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '登录 Voidmix' })).toBeVisible()
  expect(pageErrors).toEqual([])
})
