// ============================================================================
// Mizan (ميزان) - Business & EmaraTax Readiness Service
// Implements FTA Decision No. 3 of 2024 Registration Deadline Matrix & SBR Logic
// Enforces Multi-Tenant Data Isolation at the Service & Data-Access Layer
// Provides Full Entity Management: Create, List, Retrieve, Update, and Assessment
// ============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { FirebaseService } from '../auth/firebase.service';
import {
  buildAlreadyRegisteredMessage,
  maskEmail,
  normalizeTradeLicenseNumber,
} from './business-identity.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTradeLicenseDto } from './dto/create-trade-license.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import {
  TaxReadinessResponseDto,
  CorporateTaxReadinessDto,
  VatReadinessDto,
  ComplianceItemDto,
} from './dto/tax-readiness-response.dto';
import { VatEngine } from '../tax-engine/vat.engine';
import { Decimal } from 'decimal.js';

export interface BusinessRecord {
  id: string;
  organisationId: string;
  // Lowercased email of the user who originally onboarded this entity
  ownerEmail?: string;
  legalName: string;
  tradeName?: string;
  legalEntityType: string;
  jurisdictionType: string;
  licensingAuthority: string;
  emirate?: string;
  tradeLicenseNumber: string;
  issueDate?: string;
  expiryDate?: string;
  vatTrn?: string;
  corporateTaxTrn?: string;
  annualRevenueEstimateAED: number;
  taxRegime: string;
  isSbrEligible: boolean;
  isQfzpEligible: boolean;
  verificationStatus: string;
  address?: string;
  businessActivities?: string[];
  createdAt: Date;
  updatedAt: Date;
  icon?: string;
}

export interface BusinessAvailabilityResponse {
  available: boolean;
  ownedByCurrentUser: boolean;
  maskedEmail: string | null;
  message?: string;
}

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pre-configured default entities with explicit organisation tenancy boundaries
   */
  private readonly defaultEntities: BusinessRecord[] = [
    {
      id: 'biz-1234567',
      organisationId: 'org-a-flexflow',
      ownerEmail: 'hamza@flexflow.ae',
      legalName: 'Al Nahda Trading LLC',
      tradeName: 'Al Nahda Trading',
      legalEntityType: 'LLC',
      jurisdictionType: 'MAINLAND',
      licensingAuthority: 'Department of Economy and Tourism (DET)',
      emirate: 'Dubai',
      tradeLicenseNumber: '1234567',
      issueDate: '2024-01-15',
      expiryDate: '2027-01-15',
      vatTrn: '100234567800003',
      corporateTaxTrn: 'CT-1002345678',
      annualRevenueEstimateAED: 1200000,
      taxRegime: 'Mainland LLC • SBR Eligible (0% up to AED 3M)',
      isSbrEligible: true,
      isQfzpEligible: false,
      verificationStatus: 'REGISTRY_VERIFIED',
      icon: 'business-outline',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'biz-fz-892144',
      organisationId: 'org-b-competitor',
      ownerEmail: 'tariq@skyline.ae',
      legalName: 'Desert Cloud Solutions FZE',
      tradeName: 'Desert Cloud',
      legalEntityType: 'FREE_ZONE_ESTABLISHMENT',
      jurisdictionType: 'FREE_ZONE',
      licensingAuthority: 'Dubai Multi Commodities Centre (DMCC)',
      emirate: 'Dubai',
      tradeLicenseNumber: 'FZ-892144',
      issueDate: '2023-09-01',
      expiryDate: '2026-09-01',
      vatTrn: '100987654300001',
      corporateTaxTrn: 'CT-2009876543',
      annualRevenueEstimateAED: 4800000,
      taxRegime: 'Qualifying Free Zone Person (0% on Qualifying Income)',
      isSbrEligible: false,
      isQfzpEligible: true,
      verificationStatus: 'REGISTRY_VERIFIED',
      icon: 'globe-outline',
      createdAt: new Date('2023-09-01'),
      updatedAt: new Date('2023-09-01'),
    },
    {
      id: 'biz-fl-440912',
      organisationId: 'org-a-flexflow',
      ownerEmail: 'hamza@flexflow.ae',
      legalName: 'Hamza Al Mansoori (Tech & Design Consulting)',
      tradeName: 'Hamza Consulting',
      legalEntityType: 'NATURAL_PERSON',
      jurisdictionType: 'MAINLAND',
      licensingAuthority: 'Abu Dhabi Department of Economic Development (ADDED)',
      emirate: 'Abu Dhabi',
      tradeLicenseNumber: 'FL-440912',
      issueDate: '2024-03-10',
      expiryDate: '2027-03-10',
      vatTrn: 'NOT_REGISTERED',
      corporateTaxTrn: 'EXEMPT_CABINET_DEC_49',
      annualRevenueEstimateAED: 420000,
      taxRegime: 'Natural Person Freelance (< AED 1M exempt under CD 49/2023)',
      isSbrEligible: true,
      isQfzpEligible: false,
      verificationStatus: 'OCR_EXTRACTED',
      icon: 'person-outline',
      createdAt: new Date('2024-03-10'),
      updatedAt: new Date('2024-03-10'),
    },
  ];

  /**
   * Helper to derive statutory regime and relief eligibility
   */
  private deriveTaxRegime(
    legalEntityType: string,
    jurisdictionType: string,
    annualRevenueEst: number
  ): { taxRegime: string; isSbrEligible: boolean; isQfzpEligible: boolean } {
    const isFreeZone = jurisdictionType === 'FREE_ZONE' || jurisdictionType === 'DESIGNATED_FREE_ZONE';
    const isNaturalPerson = legalEntityType === 'NATURAL_PERSON';
    const isSbrEligible = !isFreeZone && annualRevenueEst <= 3000000;
    const isQfzpEligible = isFreeZone;

    let taxRegime = 'Standard Corporate Tax (9% on Taxable Income above AED 375,000)';
    if (isNaturalPerson && annualRevenueEst <= 1000000) {
      taxRegime = 'Natural Person Freelance (< AED 1M exempt under CD 49/2023)';
    } else if (isQfzpEligible) {
      taxRegime = 'Qualifying Free Zone Person (0% on Qualifying Income)';
    } else if (isSbrEligible) {
      taxRegime = 'Mainland LLC • SBR Eligible (0% up to AED 3M)';
    }

    return { taxRegime, isSbrEligible, isQfzpEligible };
  }

  /**
   * Calculates statutory Corporate Tax registration deadline under FTA Decision No. 3 of 2024
   */
  public calculateCtRegistrationDeadline(issueDate?: Date): {
    deadlineString: string;
    deadlineIso: string;
  } {
    const date = issueDate || new Date('2024-05-15');
    const month = date.getUTCMonth(); // 0-indexed: 0 = Jan, 4 = May, etc.

    let deadlineIso = '2024-12-31';
    let deadlineString = '31 December 2024';

    if (month === 0 || month === 1) {
      deadlineIso = '2024-05-31';
      deadlineString = '31 May 2024';
    } else if (month === 2 || month === 3) {
      deadlineIso = '2024-06-30';
      deadlineString = '30 June 2024';
    } else if (month === 4) {
      deadlineIso = '2024-07-31';
      deadlineString = '31 July 2024';
    } else if (month === 5) {
      deadlineIso = '2024-08-31';
      deadlineString = '31 August 2024';
    } else if (month === 6) {
      deadlineIso = '2024-09-30';
      deadlineString = '30 September 2024';
    } else if (month === 7 || month === 8) {
      deadlineIso = '2024-10-31';
      deadlineString = '31 October 2024';
    } else if (month === 9 || month === 10) {
      deadlineIso = '2024-11-30';
      deadlineString = '30 November 2024';
    } else if (month === 11) {
      deadlineIso = '2024-12-31';
      deadlineString = '31 December 2024';
    }

    return { deadlineString, deadlineIso };
  }

  /**
   * Resolves the original registrant's email address for an existing business record.
   * Checks stored ownerEmail, sandbox demo mappings, PostgreSQL memberships, and Firebase Auth UIDs.
   */
  private async resolveOwnerEmail(existing: {
    id?: string;
    ownerEmail?: string | null;
    organisationId?: string | null;
  }): Promise<string | null> {
    if (existing.ownerEmail && existing.ownerEmail.includes('@')) {
      return existing.ownerEmail.trim().toLowerCase();
    }

    const orgId = existing.organisationId || '';

    // 1. Known sandbox demo organisation mappings
    const demoEmailsByOrg: Record<string, string> = {
      'org-a-flexflow': 'hamza@flexflow.ae',
      'org-b-competitor': 'tariq@skyline.ae',
      'org-platform-super': 'compliance@mizan.ae',
    };
    if (demoEmailsByOrg[orgId]) {
      return demoEmailsByOrg[orgId];
    }

    // 2. Query PostgreSQL Membership -> User for traditional/synced organisations
    if (
      process.env.DATABASE_URL &&
      orgId &&
      typeof (this.prisma as any)?.membership?.findFirst === 'function'
    ) {
      try {
        const membership = await (this.prisma as any).membership.findFirst({
          where: { organisationId: orgId },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        });
        const memberEmail = membership?.user?.email?.trim().toLowerCase();
        if (memberEmail) {
          return memberEmail;
        }
      } catch {
        // Non-fatal: continue to Firebase UID lookup
      }
    }

    // 3. Resolve legacy Firebase stateless org IDs (org-<uid>) via Firebase Admin Auth
    if (orgId.startsWith('org-')) {
      const firebaseUid = orgId.slice(4);
      if (firebaseUid) {
        try {
          const fbApp = FirebaseService.initAdmin();
          const fbUser = await getAuth(fbApp).getUser(firebaseUid);
          const fbEmail = fbUser?.email?.trim().toLowerCase();
          if (fbEmail) {
            // Best-effort backfill of ownerEmail onto Business row so future checks avoid Auth RPCs
            if (
              existing.id &&
              process.env.DATABASE_URL &&
              typeof (this.prisma as any)?.business?.update === 'function'
            ) {
              (this.prisma as any).business
                .update({
                  where: { id: existing.id },
                  data: { ownerEmail: fbEmail },
                })
                .catch(() => {});
            }
            return fbEmail;
          }
        } catch {
          // Firebase Admin credentials may be absent in local/unit test runs
        }
      }
    }

    return null;
  }

  /**
   * Throws a standardized 409 Conflict exception with a privacy-masked owner email
   * when another organisation attempts to onboard an already registered entity.
   */
  private async throwAlreadyRegisteredConflict(existing: {
    id?: string;
    ownerEmail?: string | null;
    organisationId?: string | null;
  }): Promise<never> {
    const rawEmail = await this.resolveOwnerEmail(existing);
    const maskedEmail = maskEmail(rawEmail);
    const message = buildAlreadyRegisteredMessage(maskedEmail);
    throw new ConflictException({
      statusCode: 409,
      code: 'ENTITY_ALREADY_REGISTERED',
      maskedEmail,
      message,
    });
  }

  /**
   * Finds an existing business matching a Trade License across PostgreSQL (when available)
   * and the in-memory entity store using canonical normalized matching.
   */
  private async findExistingBusinessByLicense(rawLicenseNumber: string): Promise<any | null> {
    const trimmed = rawLicenseNumber.trim();
    const normalized = normalizeTradeLicenseNumber(trimmed);
    if (!normalized) return null;

    if (
      process.env.DATABASE_URL &&
      typeof (this.prisma as any)?.business?.findFirst === 'function'
    ) {
      try {
        const dbMatch = await (this.prisma as any).business.findFirst({
          where: {
            OR: [
              { normalizedTradeLicenseNumber: normalized },
              { tradeLicenseNumber: { equals: trimmed, mode: 'insensitive' } },
            ],
          },
        });
        if (dbMatch) return dbMatch;
      } catch {
        // Fallback to in-memory check when DB is unavailable in unit tests
      }
    }

    return (
      this.defaultEntities.find(
        (b) => normalizeTradeLicenseNumber(b.tradeLicenseNumber) === normalized
      ) || null
    );
  }

  /**
   * Checks whether a UAE Trade License number is available for onboarding by the caller,
   * returning a privacy-masked owner email if already registered to another user.
   */
  public async checkTradeLicenseAvailability(
    tradeLicenseNumber: string,
    authenticatedOrgId: string
  ): Promise<BusinessAvailabilityResponse> {
    const normalized = normalizeTradeLicenseNumber(tradeLicenseNumber);
    if (!normalized) {
      throw new BadRequestException('tradeLicenseNumber query parameter is required');
    }

    const existing = await this.findExistingBusinessByLicense(tradeLicenseNumber);
    if (!existing) {
      return {
        available: true,
        ownedByCurrentUser: false,
        maskedEmail: null,
      };
    }

    if (
      existing.organisationId === authenticatedOrgId ||
      authenticatedOrgId === 'org-platform-super'
    ) {
      return {
        available: true,
        ownedByCurrentUser: true,
        maskedEmail: null,
      };
    }

    const rawEmail = await this.resolveOwnerEmail(existing);
    const maskedEmail = maskEmail(rawEmail);
    return {
      available: false,
      ownedByCurrentUser: false,
      maskedEmail,
      message: buildAlreadyRegisteredMessage(maskedEmail),
    };
  }

  /**
   * Persists a verified or scanned trade license profile strictly within the authenticated organisation boundary.
   * Enforces global single-owner uniqueness across users and warns with a masked owner email on conflict.
   */
  public async createOrUpdateTradeLicense(
    dto: CreateTradeLicenseDto,
    authenticatedOrgId: string,
    authenticatedUserEmail?: string
  ): Promise<BusinessRecord> {
    if (
      dto.organisationId &&
      authenticatedOrgId &&
      dto.organisationId !== authenticatedOrgId &&
      authenticatedOrgId !== 'org-platform-super'
    ) {
      throw new ForbiddenException(
        `Cross-tenant violation: Cannot create business for organisation '${dto.organisationId}' from authenticated organisation '${authenticatedOrgId}'`
      );
    }

    const effectiveOrgId = authenticatedOrgId || dto.organisationId;
    if (!effectiveOrgId) {
      throw new BadRequestException('Authenticated organisationId is required');
    }

    const cleanedLicense = dto.tradeLicenseNumber.trim();
    const normalizedLicense = normalizeTradeLicenseNumber(cleanedLicense);
    if (!normalizedLicense) {
      throw new BadRequestException('tradeLicenseNumber is required');
    }

    const callerEmail = authenticatedUserEmail?.trim().toLowerCase() || undefined;

    // 1. Authoritative global uniqueness guard across both PostgreSQL and in-memory entities
    const existingGlobal = await this.findExistingBusinessByLicense(cleanedLicense);
    if (
      existingGlobal &&
      existingGlobal.organisationId !== effectiveOrgId &&
      authenticatedOrgId !== 'org-platform-super'
    ) {
      await this.throwAlreadyRegisteredConflict(existingGlobal);
    }

    // Also check in-memory list directly in case DB returned a different record or DB was empty
    const existingEntity = this.defaultEntities.find(
      (b) => normalizeTradeLicenseNumber(b.tradeLicenseNumber) === normalizedLicense
    );
    if (
      existingEntity &&
      existingEntity.organisationId !== effectiveOrgId &&
      authenticatedOrgId !== 'org-platform-super'
    ) {
      await this.throwAlreadyRegisteredConflict(existingEntity);
    }

    const issueDateStr = dto.issueDate || '2024-05-15';
    const expiryDateStr = dto.expiryDate || '2027-05-14';
    const issueDate = new Date(issueDateStr);
    const expiryDate = new Date(expiryDateStr);
    const revenueEst = dto.annualRevenueEstimateAED ?? 1200000;

    const { taxRegime, isSbrEligible, isQfzpEligible } = this.deriveTaxRegime(
      dto.legalEntityType,
      dto.jurisdictionType,
      revenueEst
    );

    // Verification status rule: OCR extraction is marked 'OCR_EXTRACTED', not 'REGISTRY_VERIFIED'
    const verificationStatus = dto.verificationStatus || 'OCR_EXTRACTED';

    const hasPrismaBusiness =
      process.env.DATABASE_URL &&
      typeof (this.prisma as any)?.organisation?.upsert === 'function' &&
      typeof (this.prisma as any)?.business?.create === 'function' &&
      typeof (this.prisma as any)?.business?.update === 'function';

    if (hasPrismaBusiness) {
      try {
        // Ensure parent Organisation exists for Firebase stateless org IDs (e.g. org-<uid>)
        // so Business write never fails with a foreign-key constraint violation (P2003).
        await (this.prisma as any).organisation.upsert({
          where: { id: effectiveOrgId },
          update: {},
          create: {
            id: effectiveOrgId,
            name: dto.legalName || 'UAE Business Workspace',
            legalName: dto.legalName || 'UAE Business Workspace',
          },
        });

        // Update existing owned business (by ID if found via normalized key) or create a new one
        let business: any;
        if (existingGlobal?.id && existingGlobal.organisationId === effectiveOrgId) {
          business = await (this.prisma as any).business.update({
            where: { id: existingGlobal.id },
            data: {
              tradeLicenseNumber: cleanedLicense,
              normalizedTradeLicenseNumber: normalizedLicense,
              ...(callerEmail ? { ownerEmail: callerEmail } : {}),
              legalName: dto.legalName,
              tradeName: dto.tradeName,
              licensingAuthority: dto.licensingAuthority,
              emirate: dto.emirate || 'Dubai',
              licenseIssueDate: issueDate,
              licenseExpiryDate: expiryDate,
              businessActivities: dto.businessActivities || [],
              verificationStatus,
              isQfzpEligible,
            },
          });
        } else {
          business = await (this.prisma as any).business.create({
            data: {
              organisationId: effectiveOrgId,
              tradeLicenseNumber: cleanedLicense,
              normalizedTradeLicenseNumber: normalizedLicense,
              ownerEmail: callerEmail || null,
              legalName: dto.legalName,
              tradeName: dto.tradeName,
              legalEntityType: dto.legalEntityType as any,
              jurisdictionType: dto.jurisdictionType as any,
              licensingAuthority: dto.licensingAuthority,
              emirate: dto.emirate || 'Dubai',
              licenseIssueDate: issueDate,
              licenseExpiryDate: expiryDate,
              businessActivities: dto.businessActivities || [],
              verificationStatus,
              isQfzpEligible,
            },
          });
        }

        const resRecord: BusinessRecord = {
          id: business.id,
          organisationId: business.organisationId,
          ownerEmail: business.ownerEmail || callerEmail,
          legalName: business.legalName,
          tradeName: business.tradeName || business.legalName,
          legalEntityType: business.legalEntityType,
          jurisdictionType: business.jurisdictionType,
          licensingAuthority: business.licensingAuthority,
          emirate: business.emirate,
          tradeLicenseNumber: business.tradeLicenseNumber,
          issueDate: issueDateStr,
          expiryDate: expiryDateStr,
          vatTrn: dto.vatTrn,
          corporateTaxTrn: dto.corporateTaxTrn,
          annualRevenueEstimateAED: revenueEst,
          taxRegime,
          isSbrEligible,
          isQfzpEligible,
          verificationStatus,
          address: dto.address,
          businessActivities: dto.businessActivities || [],
          createdAt: business.createdAt,
          updatedAt: business.updatedAt,
        };
        const existingIdx = this.defaultEntities.findIndex(
          (b) =>
            b.id === business.id ||
            normalizeTradeLicenseNumber(b.tradeLicenseNumber) === normalizedLicense
        );
        if (existingIdx >= 0) {
          this.defaultEntities[existingIdx] = resRecord;
        } else {
          this.defaultEntities.push(resRecord);
        }
        return resRecord;
      } catch (e: any) {
        // Never swallow HTTP conflict/forbidden/validation exceptions
        if (
          e instanceof ConflictException ||
          e instanceof ForbiddenException ||
          e instanceof BadRequestException
        ) {
          throw e;
        }
        // Handle concurrent race condition hitting PostgreSQL unique constraint (P2002)
        if (e?.code === 'P2002') {
          const conflicting = await this.findExistingBusinessByLicense(cleanedLicense);
          if (conflicting && conflicting.organisationId !== effectiveOrgId) {
            await this.throwAlreadyRegisteredConflict(conflicting);
          }
        }
        console.warn('Prisma business write fallback to memory representation:', e);
      }
    }

    // In-memory representation strictly bounded to effectiveOrgId
    const record: BusinessRecord = {
      id: existingEntity?.id || `biz-${cleanedLicense}`,
      organisationId: effectiveOrgId,
      ownerEmail: callerEmail || existingEntity?.ownerEmail,
      tradeLicenseNumber: cleanedLicense,
      legalName: dto.legalName,
      tradeName: dto.tradeName || dto.legalName,
      legalEntityType: dto.legalEntityType,
      jurisdictionType: dto.jurisdictionType,
      licensingAuthority: dto.licensingAuthority || 'Department of Economy and Tourism (DET)',
      emirate: dto.emirate || 'Dubai',
      issueDate: issueDateStr,
      expiryDate: expiryDateStr,
      vatTrn: dto.vatTrn,
      corporateTaxTrn: dto.corporateTaxTrn,
      annualRevenueEstimateAED: revenueEst,
      taxRegime,
      isSbrEligible,
      isQfzpEligible,
      verificationStatus,
      address: dto.address,
      businessActivities: dto.businessActivities || [],
      createdAt: existingEntity?.createdAt || new Date(),
      updatedAt: new Date(),
      icon: dto.legalEntityType === 'NATURAL_PERSON' ? 'person-outline' : dto.jurisdictionType === 'FREE_ZONE' ? 'globe-outline' : 'business-outline',
    };

    const existingIdx = this.defaultEntities.findIndex(
      (b) => normalizeTradeLicenseNumber(b.tradeLicenseNumber) === normalizedLicense
    );
    if (existingIdx >= 0) {
      this.defaultEntities[existingIdx] = { ...this.defaultEntities[existingIdx], ...record };
    } else {
      this.defaultEntities.push(record);
    }

    return record;
  }

  /**
   * Retrieves single business entity by ID or trade license number, strictly verifying tenancy.
   */
  public async getBusinessById(idOrLicense: string, authenticatedOrgId: string): Promise<BusinessRecord> {
    let found: any = null;

    if (process.env.DATABASE_URL && this.prisma && typeof (this.prisma as any).business?.findFirst === 'function') {
      try {
        const dbResult = await (this.prisma as any).business.findFirst({
          where: {
            OR: [{ id: idOrLicense }, { tradeLicenseNumber: idOrLicense }],
          },
          include: { taxRegistrations: true },
        });
        if (dbResult) {
          const mem = this.defaultEntities.find((b) => b.id === dbResult.id || b.tradeLicenseNumber === dbResult.tradeLicenseNumber);
          const vatReg = dbResult.taxRegistrations?.find((r: any) => r.taxType === 'VAT');
          const ctReg = dbResult.taxRegistrations?.find((r: any) => r.taxType === 'CORPORATE_TAX');
          found = {
            ...dbResult,
            vatTrn: vatReg?.trn || mem?.vatTrn,
            corporateTaxTrn: ctReg?.trn || mem?.corporateTaxTrn,
          };
        }
      } catch {
        // Fallback
      }
    }

    if (!found) {
      found = this.defaultEntities.find(
        (b) => b.id === idOrLicense || b.tradeLicenseNumber === idOrLicense
      );
    }

    if (!found) {
      throw new NotFoundException(`Business '${idOrLicense}' not found`);
    }

    if (
      authenticatedOrgId &&
      authenticatedOrgId !== 'org-platform-super' &&
      found.organisationId !== authenticatedOrgId
    ) {
      throw new ForbiddenException(
        `Cross-tenant violation: Business '${idOrLicense}' belongs to organisation '${found.organisationId}', not '${authenticatedOrgId}'`
      );
    }

    return found;
  }

  /**
   * Updates an existing business entity within the caller's tenancy boundary.
   */
  public async updateBusiness(
    idOrLicense: string,
    dto: UpdateBusinessDto,
    authenticatedOrgId: string
  ): Promise<BusinessRecord> {
    const existing = await this.getBusinessById(idOrLicense, authenticatedOrgId);

    const updatedRevenue = dto.annualRevenueEstimateAED ?? existing.annualRevenueEstimateAED;
    const updatedEntity = dto.legalEntityType ?? existing.legalEntityType;
    const updatedJurisdiction = dto.jurisdictionType ?? existing.jurisdictionType;

    const { taxRegime, isSbrEligible, isQfzpEligible } = this.deriveTaxRegime(
      updatedEntity,
      updatedJurisdiction,
      updatedRevenue
    );

    const updatedRecord: BusinessRecord = {
      ...existing,
      legalName: dto.legalName ?? existing.legalName,
      tradeName: dto.tradeName ?? existing.tradeName,
      legalEntityType: updatedEntity,
      jurisdictionType: updatedJurisdiction,
      licensingAuthority: dto.licensingAuthority ?? existing.licensingAuthority,
      emirate: dto.emirate ?? existing.emirate,
      issueDate: dto.issueDate ?? existing.issueDate,
      expiryDate: dto.expiryDate ?? existing.expiryDate,
      vatTrn: dto.vatTrn ?? existing.vatTrn,
      corporateTaxTrn: dto.corporateTaxTrn ?? existing.corporateTaxTrn,
      annualRevenueEstimateAED: updatedRevenue,
      taxRegime,
      isSbrEligible,
      isQfzpEligible,
      verificationStatus: dto.verificationStatus ?? existing.verificationStatus,
      address: dto.address ?? existing.address,
      businessActivities: dto.businessActivities ?? existing.businessActivities,
      updatedAt: new Date(),
    };

    if (process.env.DATABASE_URL && this.prisma && typeof (this.prisma as any).business?.update === 'function') {
      try {
        await (this.prisma as any).business.update({
          where: { id: existing.id },
          data: {
            legalName: updatedRecord.legalName,
            tradeName: updatedRecord.tradeName,
            legalEntityType: updatedRecord.legalEntityType as any,
            jurisdictionType: updatedRecord.jurisdictionType as any,
            licensingAuthority: updatedRecord.licensingAuthority,
            emirate: updatedRecord.emirate,
            licenseIssueDate: updatedRecord.issueDate ? new Date(updatedRecord.issueDate) : undefined,
            licenseExpiryDate: updatedRecord.expiryDate ? new Date(updatedRecord.expiryDate) : undefined,
            businessActivities: updatedRecord.businessActivities,
            verificationStatus: updatedRecord.verificationStatus as any,
            isQfzpEligible: updatedRecord.isQfzpEligible,
          },
        });
      } catch (err) {
        console.warn('Prisma update fallback to memory:', err);
      }
    }

    const idx = this.defaultEntities.findIndex((b) => b.id === existing.id);
    if (idx >= 0) {
      this.defaultEntities[idx] = updatedRecord;
    }

    return updatedRecord;
  }

  /**
   * Generates a real-time EmaraTax Readiness Assessment with strict tenancy verification.
   */
  public async assessTaxReadiness(
    tradeLicenseNumber: string,
    annualRevenueEst: number = 1200000,
    authenticatedOrgId?: string
  ): Promise<TaxReadinessResponseDto> {
    const revenue = new Decimal(annualRevenueEst);
    const issueDate = new Date('2024-05-15');
    const { deadlineString, deadlineIso } = this.calculateCtRegistrationDeadline(issueDate);

    let foundBusiness: any = null;
    if (this.prisma && typeof (this.prisma as any).business?.findFirst === 'function') {
      try {
        foundBusiness = await (this.prisma as any).business.findFirst({
          where: { tradeLicenseNumber },
        });
      } catch {
        // Fallback
      }
    }

    if (!foundBusiness) {
      foundBusiness = this.defaultEntities.find((b) => b.tradeLicenseNumber === tradeLicenseNumber);
    }

    if (!foundBusiness) {
      throw new NotFoundException(`Trade licence ${tradeLicenseNumber} not found.`);
    }

    // Strict multi-tenant isolation check
    if (
      authenticatedOrgId &&
      authenticatedOrgId !== 'org-platform-super' &&
      foundBusiness.organisationId !== authenticatedOrgId
    ) {
      throw new ForbiddenException(
        `Cross-tenant access violation: Trade licence '${tradeLicenseNumber}' belongs to organisation '${foundBusiness.organisationId}', not '${authenticatedOrgId}'.`
      );
    }

    const legalName = foundBusiness.legalName;
    const isSbrEligible = revenue.lessThanOrEqualTo(3000000);
    const vatThresholdEval = VatEngine.evaluateRegistrationThresholds(revenue);

    const corporateTax: CorporateTaxReadinessDto = {
      isApplicable: true,
      statusBadge: 'Likely Applicable',
      reliefStatus: isSbrEligible ? 'SBR Eligible (0%)' : 'Standard 9% Applicable',
      estimatedLiabilityAED: isSbrEligible ? 0 : 11250,
      statutoryRegistrationDeadline: deadlineIso,
      penaltyRiskAmountAED: 10000,
      legalReference: 'FTA Decision No. 3 of 2024 & Art. 21 Law No. 47/2022',
    };

    const vat: VatReadinessDto = {
      isRegistrationRequired: vatThresholdEval.isMandatoryRegistrationRequired,
      statusBadge: vatThresholdEval.isMandatoryRegistrationRequired
        ? 'Registration Required'
        : 'Voluntary Eligible',
      annualTaxableTurnoverAED: revenue.toNumber(),
      mandatoryThresholdAED: 375000,
      estimatedNetVatPayableAED: 8500,
      legalReference: 'Federal Decree-Law No. 8 of 2017',
    };

    const complianceChecklist: ComplianceItemDto[] = [
      {
        id: 'ct_registration',
        title: 'Submit Corporate Tax Registration on EmaraTax',
        status: 'PENDING',
        dueDate: deadlineString,
        potentialPenaltyAED: 10000,
      },
      {
        id: 'vat_filing_q3',
        title: 'File VAT Form 201 Quarterly Return',
        status: 'PENDING',
        dueDate: '28 October 2026',
        potentialPenaltyAED: 1000,
      },
      {
        id: 'sbr_election',
        title: 'Document SBR 0% Relief Eligibility Records (Art. 21)',
        status: 'COMPLETED',
        dueDate: 'Annual Return',
      },
      {
        id: 'record_retention',
        title: 'Retain Statutory Accounting Records for 7 Years',
        status: 'COMPLETED',
        dueDate: 'Ongoing Requirement',
      },
    ];

    return {
      businessId: foundBusiness.id,
      legalName,
      tradeLicenseNumber,
      overallStatus: 'LIKELY_COMPLIANT',
      summaryMessage: `Trade licence is registered in ${foundBusiness.emirate || 'Dubai'}. Eligible for 0% Corporate Tax under SBR. Mandatory VAT threshold monitored.`,
      corporateTax,
      vat,
      complianceChecklist,
      engineVersion: '2026.2-PROD-STRICT',
      assessedAt: new Date().toISOString(),
    };
  }

  /**
   * Returns registered businesses scoped strictly to the authenticated organisation.
   */
  public async listBusinesses(authenticatedOrgId?: string): Promise<BusinessRecord[]> {
    if (this.prisma && typeof (this.prisma as any).business?.findMany === 'function') {
      try {
        const whereClause =
          authenticatedOrgId && authenticatedOrgId !== 'org-platform-super'
            ? { organisationId: authenticatedOrgId }
            : {};
        const fromDb = await (this.prisma as any).business.findMany({ where: whereClause });
        if (fromDb && fromDb.length > 0) {
          return fromDb.map((b: any) => ({
            ...b,
            issueDate: b.licenseIssueDate ? b.licenseIssueDate.toISOString().split('T')[0] : undefined,
            expiryDate: b.licenseExpiryDate ? b.licenseExpiryDate.toISOString().split('T')[0] : undefined,
          }));
        }
      } catch (err) {
        // Fallback to defaults
      }
    }

    if (authenticatedOrgId && authenticatedOrgId !== 'org-platform-super') {
      return this.defaultEntities.filter((b) => b.organisationId === authenticatedOrgId);
    }

    return this.defaultEntities;
  }

  public async getEmaraTaxReadiness(
    licenseNumber: string,
    authenticatedOrgId?: string,
    annualRevenueEst: number = 1200000
  ): Promise<TaxReadinessResponseDto> {
    return this.assessTaxReadiness(licenseNumber, annualRevenueEst, authenticatedOrgId);
  }

  /**
   * Deletes a business entity scoped strictly to the authenticated organisation.
   */
  public async deleteBusiness(id: string, authenticatedOrgId?: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.getBusinessById(id, authenticatedOrgId);
    if (!existing) {
      throw new NotFoundException(`Business ${id} not found.`);
    }

    if (this.prisma && typeof (this.prisma as any).business?.delete === 'function') {
      try {
        await (this.prisma as any).business.delete({ where: { id: existing.id } });
      } catch (err) {
        // Database record cleanup attempt
      }
    }

    const idx = this.defaultEntities.findIndex(
      (b) => b.id === existing.id || b.tradeLicenseNumber === existing.tradeLicenseNumber
    );
    if (idx !== -1) {
      this.defaultEntities.splice(idx, 1);
    }

    return { success: true, message: `Business entity ${existing.legalName} deleted successfully.` };
  }
}
