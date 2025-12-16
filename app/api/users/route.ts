import { validateRequest } from "@/lib/auth/utils";
import { NextResponse } from "next/server";
import {
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  updateUserRole,
} from "@/lib/auth/admin";
import { handleError } from "@/lib/utils/error-handler";

export async function GET(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Permitir acesso a todos os usuários autenticados para visualização

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const query = searchParams.get("query") || undefined;

    const result = await listUsers({
      limit,
      offset,
      query,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      users: result.users?.data || [],
      totalCount: result.users?.totalCount || 0,
    });
  } catch (error: any) {
    return handleError(error, { route: "GET /api/users" });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { emailAddress, firstName, lastName, password, role } = body;

    if (!emailAddress || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, nome e sobrenome são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await createUser({
      email: emailAddress,
      firstName,
      lastName,
      password: password || undefined,
      role: role || "user",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ user: result.user });
  } catch (error: any) {
    return handleError(error, { route: "POST /api/users" });
  }
}

export async function PUT(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { userId: targetUserId, firstName, lastName, role } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (role) {
      updateData.role = role;
    }

    const result = await updateUser(targetUserId, updateData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ user: result.user });
  } catch (error: any) {
    return handleError(error, { route: "PUT /api/users" });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório" },
        { status: 400 }
      );
    }

    const result = await deleteUser(targetUserId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, { route: "DELETE /api/users" });
  }
}

