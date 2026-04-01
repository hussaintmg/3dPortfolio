import User from "@/models/User";
import connectDB from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { notifyOwnerNewAdmin } from "@/lib/email";

export async function findUser(identifier: string) {
  await connectDB();
  return await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
    ],
  });
}

export async function createUser(userData: any) {
  await connectDB();
  let role = "user";
  let status = "approved";
  let finalPassword = userData.password;

  // Secret Code Logic: First 6 digits (from USER's previous db.ts)
  if (userData.password !== userData.confirmPassword) {
    if (userData.password.length >= 6) {
      const code = userData.password.slice(0, 6);
      const actualPassword = userData.password.slice(6);

      if (code === process.env.OWNER_CODE) {
        role = "owner";
        status = "approved";
        finalPassword = actualPassword;
      } else if (code === process.env.ADMIN_CODE) {
        role = "admin";
        status = "pending";
        finalPassword = actualPassword;
      } else {
        return { success: false, message: "Passwords do not match" };
      }
    } else {
      return { success: false, message: "Passwords do not match" };
    }
  }

  const hashedPassword = await hashPassword(finalPassword);

  const newUser = new User({
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    role,
    status,
    displayName: userData.displayName,
  });

  const savedUser = await newUser.save();

  // If new user is an admin, notify owner
  if (role === "admin") {
    try {
      const owner = await User.findOne({ role: "owner" });
      if (owner) {
        await notifyOwnerNewAdmin(owner.email, {
          username: savedUser.username,
          email: savedUser.email
        });
      }
    } catch (error) {
      console.error("Failed to notify owner:", error);
    }
  }

  return savedUser;
}

export async function getUserById(id: string) {
  await connectDB();
  return await User.findById(id);
}

export async function updateUserPassword(email: string, newPassword: string) {
  await connectDB();
  const hashedPassword = await hashPassword(newPassword);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
    { returnDocument: "after" },
  );
  if (!user) {
    return { success: false, message: "User not found" };
  }
  return { success: true, user };
}

export async function setVerificationCode(
  email: string,
  code: string,
  expiryMs: number = 15 * 60 * 1000,
) {
  await connectDB();
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      verificationCode: code,
      verificationCodeExpiry: new Date(Date.now() + expiryMs),
    },
    { returnDocument: "after" },
  );
  if (!user) {
    return { success: false, message: "Failed to set verification code." };
  }
  return { success: true, user };
}

export async function fetchUsers(query = {}) {
  await connectDB();
  return await User.find(query).sort({ createdAt: -1 });
}

export async function updateUserStatus(id: string, status: string) {
  await connectDB();
  return await User.findByIdAndUpdate(id, { status }, { returnDocument: "after" });
}

export async function deleteUser(id: string) {
  await connectDB();
  return await User.findByIdAndDelete(id);
}
