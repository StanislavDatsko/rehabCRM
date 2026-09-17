export type VerifiedAccessToken = {
  subject: string;
  email?: string;
};

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export interface TokenVerifier {
  verify(accessToken: string): Promise<VerifiedAccessToken>;
}
