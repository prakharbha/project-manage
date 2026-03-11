var _a;
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prismaClientSingleton = () => {
    return new PrismaClient({ adapter });
};
const prisma = (_a = globalThis.prismaGlobal) !== null && _a !== void 0 ? _a : prismaClientSingleton();
export default prisma;
if (process.env.NODE_ENV !== 'production')
    globalThis.prismaGlobal = prisma;
