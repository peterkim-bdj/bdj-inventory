/**
 * Custom Auth.js adapter for Prisma 7.
 * @auth/prisma-adapter does not support Prisma 7 yet.
 */
import type { Adapter, AdapterAccount, AdapterUser, AdapterSession } from 'next-auth/adapters';
import type { PrismaClient } from '@/generated/prisma/client';

export function PrismaAdapter(p: PrismaClient): Adapter {
  return {
    createUser: async (data) => {
      const user = await p.user.create({
        data: {
          name: data.name,
          email: data.email,
          emailVerified: data.emailVerified,
          image: data.image,
        },
      });
      return user as AdapterUser;
    },

    getUser: async (id) => {
      const user = await p.user.findUnique({ where: { id } });
      return (user as AdapterUser) ?? null;
    },

    getUserByEmail: async (email) => {
      const user = await p.user.findUnique({ where: { email } });
      return (user as AdapterUser) ?? null;
    },

    getUserByAccount: async ({ providerAccountId, provider }) => {
      const account = await p.account.findUnique({
        where: {
          provider_providerAccountId: { provider, providerAccountId },
        },
        include: { user: true },
      });
      return (account?.user as AdapterUser) ?? null;
    },

    updateUser: async ({ id, ...data }) => {
      const user = await p.user.update({
        where: { id },
        data,
      });
      return user as AdapterUser;
    },

    deleteUser: async (id) => {
      await p.user.delete({ where: { id } });
    },

    linkAccount: async (data) => {
      await p.account.create({ data: data as AdapterAccount & { userId: string } });
    },

    unlinkAccount: async ({ providerAccountId, provider }) => {
      await p.account.delete({
        where: {
          provider_providerAccountId: { provider, providerAccountId },
        },
      });
    },

    createSession: async (data) => {
      const session = await p.session.create({ data });
      return session as AdapterSession;
    },

    getSessionAndUser: async (sessionToken) => {
      const session = await p.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!session) return null;
      const { user, ...rest } = session;
      return { session: rest as AdapterSession, user: user as AdapterUser };
    },

    updateSession: async ({ sessionToken, ...data }) => {
      const session = await p.session.update({
        where: { sessionToken },
        data,
      });
      return session as AdapterSession;
    },

    deleteSession: async (sessionToken) => {
      await p.session.delete({ where: { sessionToken } });
    },

    createVerificationToken: async (data) => {
      return await p.verificationToken.create({ data });
    },

    useVerificationToken: async ({ identifier, token }) => {
      try {
        return await p.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
      } catch {
        return null;
      }
    },
  };
}
