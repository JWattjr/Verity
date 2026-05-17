import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import { serializeUser } from "../users/users.service";
import { UserModel } from "../users/users.model";
import type { AuthTokenPayload } from "./auth.model";

interface AuthResponse {
  token: string;
  user: ReturnType<typeof serializeUser>;
}

function signToken(payload: AuthTokenPayload): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtSecret, options);
}

export async function register(input: {
  email: string;
  password: string;
  username: string;
  display_name?: string | null;
}): Promise<AuthResponse> {
  const existing = await UserModel.findOne({
    $or: [{ email: input.email.toLowerCase() }, { username: input.username }],
  });

  if (existing) throw new HttpError(409, "Email or username is already in use.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await UserModel.create({
    email: input.email.toLowerCase(),
    passwordHash,
    username: input.username,
    displayName: input.display_name || null,
  });

  return {
    token: signToken({ id: user.id, email: user.email || undefined }),
    user: serializeUser(user),
  };
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const user = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (!user?.passwordHash) throw new HttpError(401, "Invalid email or password.");

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) throw new HttpError(401, "Invalid email or password.");

  return {
    token: signToken({ id: user.id, email: user.email || undefined }),
    user: serializeUser(user),
  };
}

export async function me(userId: string): Promise<AuthResponse["user"]> {
  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, "User not found.");
  return serializeUser(user);
}
