-- AlterTable
ALTER TABLE "User" ADD COLUMN     "additionalRoles" "Role"[] DEFAULT ARRAY[]::"Role"[];
