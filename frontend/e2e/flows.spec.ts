import { test, expect, Page } from '@playwright/test';

const APP_URL = '/';

async function ensureDocumentLoaded(page: Page) {
  await page.goto(APP_URL);
  const isOutlineVisible = await page.getByText('Document Outline').isVisible().catch(() => false);
  if (!isOutlineVisible) {
    await page.getByRole('button', { name: /Residential Lease/i }).first().click();
    await expect(page.getByText('Document Outline')).toBeVisible({ timeout: 10000 });
  }
}

test.describe('Legal Clarity - Critical End-to-End User Workflows', () => {
  test('1. Initial layout renders upload zone and legal safety branding', async ({ page }) => {
    await page.goto(APP_URL);

    // Verify Title & Branding
    await expect(page).toHaveTitle(/Legal Clarity/);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('Evidence-Grounded Document Companion')).toBeVisible();
    await expect(page.getByText('100% Grounded')).toBeVisible();
  });

  test('2. Load sample agreement and navigate workspace', async ({ page }) => {
    await ensureDocumentLoaded(page);

    // Verify document loads into 3-pane layout
    await expect(page.getByText('residential_lease_agreement.txt').first()).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText('Document Outline')).toBeVisible();

    // Verify Understand tab is default and displays summary
    await expect(page.getByText('Executive Plain-Language Summary')).toBeVisible();
    await expect(page.getByText('Residential / Commercial Lease Agreement').first()).toBeVisible();
  });

  test('3. Review clauses with ROUTINE, REVIEW, and IMPORTANT classifications', async ({ page }) => {
    await ensureDocumentLoaded(page);

    // Switch to Review tab
    await page.getByRole('tab', { name: /Review/i }).click();

    // Verify Review panel loads
    await expect(page.getByText('Clause Attention Analysis')).toBeVisible();
    await expect(page.getByText(/clauses evaluated/)).toBeVisible({ timeout: 10000 });

    // Check filter pills
    await expect(page.getByRole('button', { name: /Important/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Routine/i })).toBeVisible();

    // View source button opens evidence modal
    const viewSourceBtn = page.getByLabel(/View excerpt/i).first();
    await viewSourceBtn.waitFor({ state: 'visible', timeout: 10000 });
    await viewSourceBtn.click();
    await expect(page.getByText('Grounding Evidence Inspection')).toBeVisible();
    await expect(page.getByText('Strict Containment Verified (100%)')).toBeVisible();

    // Close modal
    await page.getByLabel('Close evidence modal').click();
    await expect(page.getByText('Grounding Evidence Inspection')).not.toBeVisible();
  });

  test('4. Ask document grounded questions and verify safe refusal', async ({ page }) => {
    await ensureDocumentLoaded(page);

    // Switch to Ask tab
    await page.getByRole('tab', { name: /Ask Document/i }).click();

    // Ask answerable question
    const input = page.getByLabel('Ask a question about this document');
    await input.fill('What is the rent amount?');
    await page.keyboard.press('Enter');

    // Verify supported answer with citation
    await expect(page.getByText('Supported by Document Evidence')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('$2,400.00').first()).toBeVisible();

    // Ask unanswerable question
    await input.fill('Is the landlord responsible for replacing light bulbs?');
    await page.keyboard.press('Enter');

    // Verify explicit refusal
    await expect(page.getByText('Document Does Not Establish Answer')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("I couldn't find information in this document that answers that question.")).toBeVisible();
  });

  test('5. Actionable checklist and Lawyer prep questions', async ({ page }) => {
    await ensureDocumentLoaded(page);

    // Switch to Checklist tab
    await page.getByRole('tab', { name: /Checklist/i }).click();
    await expect(page.getByText('Actionable Document Checklist')).toBeVisible({ timeout: 10000 });

    // Toggle checklist item
    const firstChecklist = page.locator('button[aria-label="Mark completed"]').first();
    await firstChecklist.waitFor({ state: 'visible', timeout: 10000 });
    await firstChecklist.click();
    await expect(page.getByText(/completed/)).toBeVisible();

    // Switch to Lawyer Prep tab
    await page.getByRole('tab', { name: /Lawyer Prep/i }).click();
    await expect(page.getByText('Focused Questions for Your Lawyer')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Legal Safety Notice & Disclaimers')).toBeVisible();
    await expect(page.getByLabel('Print lawyer questions')).toBeVisible({ timeout: 10000 });
  });
});
