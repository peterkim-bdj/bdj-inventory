# Phase 0-3: Vendor Data Management Plan

> **Feature**: Phase0-3
> **Version**: 0.1.0
> **Author**: Claude
> **Date**: 2026-02-09
> **Status**: Draft

---

## 1. Overview

### 1.1 Background

Phase 0-1 import script created Vendor records with **names only** — no contact info, no lead times, no notes. To build the foundation for future purchase order automation (Phase 1+), we need:
1. A way to **fill in** contact details for existing vendors
2. A **bulk import** path for teams that already have vendor info in spreadsheets
3. A **Vendor View UI** to browse, search, and manage all vendors

### 1.2 Goals

- Vendor CRUD (create, read, update, soft-delete)
- Sheet Import: CSV, XLSX file upload with preview, validation, upsert
- Vendor list/card view with filters, search, sort
- Vendor detail page showing associated products
- One-click call/email actions
- i18n support (EN/KO)

### 1.3 Non-Goals

- Google Sheets URL import (deferred — requires OAuth scope for Sheets API)
- Purchase order creation or automation (Phase 1)
- Vendor performance analytics or scoring
- Vendor portal / external access

---

## 2. Requirements

### 2.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Vendor list view with pagination | Must |
| FR-02 | Vendor card view (toggle with list) | Must |
| FR-03 | Vendor create form (all fields) | Must |
| FR-04 | Vendor edit form (inline or page) | Must |
| FR-05 | Vendor soft-delete (isActive = false) | Must |
| FR-06 | CSV/XLSX file upload + parse | Must |
| FR-07 | Import preview table with validation | Must |
| FR-08 | Import upsert by vendor name | Must |
| FR-09 | Import result summary (created/updated/skipped/errors) | Must |
| FR-10 | Search by name, contact person, code | Must |
| FR-11 | Filter: contact status (all/has contact/missing) | Must |
| FR-12 | Filter: active status (all/active/inactive) | Should |
| FR-13 | Filter: auto-notify (all/on/off) | Should |
| FR-14 | Sort: name, product count, lead time, contact status | Must |
| FR-15 | Default sort: missing contact first | Must |
| FR-16 | Vendor detail page with associated products | Must |
| FR-17 | One-click phone (tel:) and email (mailto:) actions | Should |
| FR-18 | Import template download (XLSX) | Should |
| FR-19 | i18n for all vendor UI (EN/KO) | Must |

### 2.2 Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-01 | Import handles up to 500 rows without timeout | Must |
| NFR-02 | List view loads in < 1s for 100 vendors | Must |
| NFR-03 | ADMIN role required for create/edit/delete/import | Must |
| NFR-04 | USER role can view vendors (read-only) | Must |

---

## 3. Schema

No schema changes. Vendor model already defined in Phase 0-1:

```prisma
model Vendor {
  id          String   @id @default(cuid())
  name        String   @unique
  code        String?  @unique
  contactName String?
  phone       String?
  email       String?
  website     String?
  address     String?
  notes       String?
  autoNotify  Boolean  @default(false)
  minLeadDays Int      @default(3)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  products      Product[]
  productGroups ProductGroup[]
}
```

---

## 4. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/vendors | USER+ | List with filter, search, sort, pagination |
| GET | /api/vendors/:id | USER+ | Detail with product list |
| POST | /api/vendors | ADMIN | Create vendor |
| PUT | /api/vendors/:id | ADMIN | Update vendor |
| DELETE | /api/vendors/:id | ADMIN | Soft-delete (isActive = false) |
| POST | /api/vendors/import | ADMIN | Upload + parse + upsert |
| GET | /api/vendors/import/template | ADMIN | Download XLSX template |

### GET /api/vendors Query Params

```typescript
{
  search?: string;          // name, contactName, code partial match
  hasContact?: 'true' | 'false';  // filter by contact status
  isActive?: 'true' | 'false';
  autoNotify?: 'true' | 'false';
  sortBy?: 'name' | 'productCount' | 'minLeadDays' | 'contactStatus';
  sortOrder?: 'asc' | 'desc';
  page?: number;            // default 1
  limit?: number;           // default 20
}
```

### POST /api/vendors/import

- Body: `multipart/form-data` with file (CSV or XLSX)
- Options: `duplicateAction` (skip | update), `emptyValueAction` (ignore | overwrite)
- Response:

```typescript
{
  summary: { total: number; created: number; updated: number; skipped: number; errors: number };
  errors: Array<{ row: number; field: string; message: string }>;
}
```

---

## 5. UI Pages & Components

### 5.1 Pages

| Path | Component | Description |
|------|-----------|-------------|
| /vendors | VendorsPage | List/card view with search, filters, sort |
| /vendors/new | VendorCreatePage | Create form |
| /vendors/:id | VendorDetailPage | Detail + product list |
| /vendors/:id/edit | VendorEditPage | Edit form |
| /vendors/import | VendorImportPage | Upload + preview + execute |

### 5.2 Feature Components

```
src/features/vendors/
  ├── types/index.ts          # Zod schemas, interfaces
  ├── hooks/
  │   ├── useVendors.ts       # List query with filters
  │   ├── useVendor.ts        # Single vendor query
  │   ├── useVendorMutation.ts # Create/update/delete
  │   └── useVendorImport.ts  # Import flow state
  └── components/
      ├── VendorTable.tsx      # List view
      ├── VendorCard.tsx       # Card view item
      ├── VendorGrid.tsx       # Card grid wrapper
      ├── VendorSearch.tsx     # Search input
      ├── VendorFilters.tsx    # Filter dropdowns
      ├── VendorForm.tsx       # Create/edit form (shared)
      ├── VendorDetail.tsx     # Detail content
      ├── VendorProductList.tsx # Products by this vendor
      ├── VendorImportUpload.tsx # File upload step
      ├── VendorImportPreview.tsx # Preview + validation table
      └── VendorImportResult.tsx # Import result summary
```

---

## 6. Implementation Sprints

### Sprint 1: Vendor CRUD API + List UI (Core)

**API:**
- [ ] GET /api/vendors (search, filter, sort, pagination, productCount)
- [ ] GET /api/vendors/:id (with products)
- [ ] POST /api/vendors (Zod validation)
- [ ] PUT /api/vendors/:id
- [ ] DELETE /api/vendors/:id (soft-delete)

**UI:**
- [ ] Vendor list page with table view
- [ ] Vendor card view + ViewToggle
- [ ] Search (name, contactName, code)
- [ ] Filters (contact status, active, autoNotify)
- [ ] Sort (name, productCount, minLeadDays, contactStatus)
- [ ] Pagination
- [ ] Missing contact highlight

**Nav:**
- [ ] Add "Vendors" to dashboard nav (visible to all roles)

### Sprint 2: Vendor Create/Edit/Detail

- [ ] VendorForm (shared create/edit)
- [ ] /vendors/new page
- [ ] /vendors/:id page (detail + product list)
- [ ] /vendors/:id/edit page
- [ ] One-click tel: and mailto: actions
- [ ] Soft-delete confirmation

### Sprint 3: Sheet Import

- [ ] POST /api/vendors/import (CSV + XLSX parsing)
- [ ] GET /api/vendors/import/template
- [ ] /vendors/import page
- [ ] File upload UI (drag & drop)
- [ ] Preview table with validation status
- [ ] Column mapping (auto-detect + manual adjust)
- [ ] Duplicate handling options (skip/update)
- [ ] Import execution + result summary
- [ ] Dependencies: `xlsx` (SheetJS) for parsing

### Sprint 4: i18n + Polish

- [ ] `src/messages/en/vendors.json` (all UI strings)
- [ ] `src/messages/ko/vendors.json`
- [ ] Register vendors namespace in i18n config
- [ ] Empty states, loading states, error states
- [ ] Responsive layout adjustments

---

## 7. Success Criteria

| # | Criterion |
|---|-----------|
| 1 | Vendor list displays all vendors with correct product counts |
| 2 | Missing-contact vendors appear first (default sort) |
| 3 | Search works across name, contactName, code |
| 4 | Filters work: contact status, active, autoNotify |
| 5 | List/card view toggle works |
| 6 | Vendor create form saves correctly |
| 7 | Vendor edit form updates correctly |
| 8 | Vendor detail shows associated products |
| 9 | Soft-delete sets isActive = false |
| 10 | CSV import with 50 rows works correctly |
| 11 | XLSX import with preview and validation works |
| 12 | Import upsert by name works (create new, update existing) |
| 13 | Import result summary shows correct counts |
| 14 | ADMIN can create/edit/delete/import, USER can only view |
| 15 | i18n en/ko complete for vendors namespace |
| 16 | `npm run build` passes with 0 errors |

---

## 8. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Large XLSX files (>500 rows) could timeout | Stream parsing, chunked processing |
| Column names in spreadsheets may vary | Auto-detect + manual column mapping UI |
| Duplicate vendor names during import | Upsert with configurable duplicate handling |
| Google Sheets URL import complexity | Deferred to future phase (not in scope) |

---

## 9. Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| xlsx (SheetJS) | Parse XLSX/CSV files | New install |
| react-dropzone | File upload drag & drop | New install |
| Existing: react-query, zod, next-intl | Data fetching, validation, i18n | Already installed |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1.0 | 2026-02-09 | Initial plan | Claude |
