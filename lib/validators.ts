/** @format */

import { z } from "zod";

export const registerSchema = z.object({
  nidnOrNuptk: z.string().trim().min(6, "NIDN/NUPTK minimal 6 karakter."),
  firstName: z.string().trim().min(2, "Nama depan minimal 2 karakter."),
  lastName: z.string().trim().min(2, "Nama belakang minimal 2 karakter."),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  phone: z.string().trim().optional(),
  institution: z.string().trim().min(2, "Perguruan tinggi wajib diisi."),
  faculty: z.string().trim().optional(),
  studyProgram: z.string().trim().min(2, "Program studi wajib dipilih."),
  academicPosition: z.string().trim().min(2, "Jabatan akademik wajib dipilih."),
  lecturerStatus: z.string().trim().min(2, "Status dosen wajib dipilih."),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .regex(/[A-Z]/, "Password harus memiliki huruf besar.")
    .regex(/[a-z]/, "Password harus memiliki huruf kecil.")
    .regex(/[0-9]/, "Password harus memiliki angka."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
  role: z.enum(["DOSEN", "ADMIN", "OPERATOR"]),
});

export const verifySubmissionSchema = z.object({
  status: z.enum(["VALID", "REVISION", "REJECTED"]),
  adminNote: z.string().trim().optional(),
});
