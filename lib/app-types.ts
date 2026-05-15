/** @format */

export type Role = "DOSEN" | "ADMIN" | "OPERATOR";

export type AccountStatus = "ACTIVE" | "PENDING" | "SUSPENDED";

export type DocumentStatus =
  | "NOT_UPLOADED"
  | "PENDING"
  | "VALID"
  | "REVISION"
  | "REJECTED";

export type NotificationType =
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_REVISION"
  | "DOCUMENT_REJECTED"
  | "SYSTEM";

export type DupakStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISION"
  | "APPROVED"
  | "REJECTED";
