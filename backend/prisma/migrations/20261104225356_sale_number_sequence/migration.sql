-- AlterTable
CREATE SEQUENCE sale_number_seq;
ALTER TABLE "Sale" ALTER COLUMN "number" SET DEFAULT nextval('sale_number_seq');
ALTER SEQUENCE sale_number_seq OWNED BY "Sale"."number";
