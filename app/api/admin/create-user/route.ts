import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";

// Esta rota só deve ser usada uma vez para criar o primeiro admin
// Considere remover ou proteger esta rota após criar o usuário
export async function POST() {
  try {
    console.log("🔧 Tentando criar usuário admin...");
    
    // Verificar se o usuário admin já existe
    const existingAdmin = await db.user.findUnique({
      where: { email: "admin@signflow.com" },
    });

    if (existingAdmin) {
      console.log("✅ Usuário admin já existe");
      return NextResponse.json(
        { 
          success: true,
          message: "Usuário admin já existe",
          email: "admin@signflow.com",
          credentials: {
            email: "admin@signflow.com",
            password: "admin123",
          }
        },
        { status: 200 }
      );
    }

    console.log("🔐 Criando hash da senha...");
    // Criar senha hasheada para o admin
    const password = "admin123";
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    console.log("👤 Criando usuário no banco...");
    // Criar usuário super admin
    const userId = generateIdFromEntropySize(10);

    const admin = await db.user.create({
      data: {
        id: userId,
        email: "admin@signflow.com",
        firstName: "Super",
        lastName: "Admin",
        role: "admin",
        emailVerified: true,
        password: {
          create: {
            hashedPassword: passwordHash,
          },
        },
      },
    });

    console.log("✅ Usuário admin criado com sucesso:", admin.id);

    return NextResponse.json({
      success: true,
      message: "Usuário super admin criado com sucesso!",
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      credentials: {
        email: "admin@signflow.com",
        password: "admin123",
        warning: "Altere a senha após o primeiro login!",
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar usuário admin:", error);
    console.error("Detalhes do erro:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
    
    // Tratar erros específicos
    if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED" || error.code === "P1001") {
      return NextResponse.json(
        { 
          success: false,
          error: "Erro de conexão com o banco de dados. Verifique se o servidor está rodando.",
          details: error.message
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Erro ao criar usuário admin",
        code: error.code,
      },
      { status: 500 }
    );
  }
}

