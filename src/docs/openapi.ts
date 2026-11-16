const bearer = [{ bearerAuth: [] }];

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const idParam = { name: "id", in: "path", required: true, schema: { type: "integer" } };

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Support Ticket API",
    version: "1.0.0",
    description: "API de gestion de tickets avec authentification JWT, rôles et audit logs.",
  },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string" },
              details: {},
            },
          },
        },
      },
      Ticket: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["open", "in_progress", "closed"] },
          createdAt: { type: "string", format: "date-time" },
          createdById: { type: "integer", nullable: true },
        },
      },
      PageMeta: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Connexion (limitée à 10 tentatives / 15 min par IP, verrouillage après 5 échecs)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: { email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
          "/tickets/{id}/analyze": {
  post: {
    tags: ["Tickets"],
    summary: "Analyse IA d'un ticket : résumé, catégorie, priorité, réponse suggérée (AGENT, ADMIN, SUPER_ADMIN)",
    security: bearer,
    parameters: [idParam],
    responses: {
      200: { description: "Analyse suggérée (non enregistrée)" },
      403: errorResponse("Rôle insuffisant"),
      404: errorResponse("Introuvable"),
      429: errorResponse("Trop de demandes"),
      502: errorResponse("Erreur du service d'IA"),
      503: errorResponse("IA non configurée"),
    },
  },
},
        },
        responses: {
          200: { description: "Tokens émis" },
          400: errorResponse("Données invalides"),
          401: errorResponse("Identifiants invalides"),
          429: errorResponse("Trop de tentatives ou compte verrouillé"),
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Renouveler les tokens (rotation du refresh token)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Nouveaux tokens" }, 401: errorResponse("Token invalide") },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Déconnexion (révoque le refresh token)",
        responses: { 200: { description: "Déconnecté" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Utilisateur courant",
        security: bearer,
        responses: { 200: { description: "Utilisateur" }, 401: errorResponse("Non authentifié") },
      },
    },
    "/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "Lister les tickets (un USER ne voit que les siens)",
        security: bearer,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, minimum: 1, maximum: 100 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["open", "in_progress", "closed"] } },
          { name: "q", in: "query", description: "Recherche dans titre et description", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["id", "createdAt", "status", "title"], default: "createdAt" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: {
          200: {
            description: "Page de tickets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Ticket" } },
                    meta: { $ref: "#/components/schemas/PageMeta" },
                  },
                },
              },
            },
          },
          400: errorResponse("Paramètres invalides"),
          401: errorResponse("Non authentifié"),
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "Créer un ticket",
        security: bearer,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description"],
                properties: { title: { type: "string", minLength: 3, maxLength: 150 }, description: { type: "string", maxLength: 5000 } },
              },
            },
          },
        },
        responses: { 201: { description: "Ticket créé" }, 400: errorResponse("Données invalides"), 401: errorResponse("Non authentifié") },
      },
    },
    "/tickets/{id}": {
      get: {
        tags: ["Tickets"],
        summary: "Lire un ticket (404 si non autorisé)",
        security: bearer,
        parameters: [idParam],
        responses: { 200: { description: "Ticket" }, 401: errorResponse("Non authentifié"), 404: errorResponse("Introuvable") },
      },
    },
    "/tickets/{id}/status": {
      patch: {
        tags: ["Tickets"],
        summary: "Changer le statut (AGENT, ADMIN, SUPER_ADMIN)",
        security: bearer,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["open", "in_progress", "closed"] } },
              },
            },
          },
        },
        responses: { 200: { description: "Ticket mis à jour" }, 403: errorResponse("Rôle insuffisant"), 404: errorResponse("Introuvable") },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "Lister les utilisateurs (ADMIN, SUPER_ADMIN)",
        security: bearer,
        responses: { 200: { description: "Liste" }, 403: errorResponse("Rôle insuffisant") },
      },
      post: {
        tags: ["Users"],
        summary: "Créer un utilisateur USER (ADMIN, SUPER_ADMIN), journalisé",
        security: bearer,
        responses: { 201: { description: "Créé" }, 403: errorResponse("Rôle insuffisant"), 409: errorResponse("Email déjà utilisé") },
      },
    },
    "/users/{id}/role": {
      patch: {
        tags: ["Users"],
        summary: "Changer le rôle (SUPER_ADMIN uniquement), journalisé",
        security: bearer,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: { role: { type: "string", enum: ["SUPER_ADMIN", "ADMIN", "AGENT", "USER"] } },
              },
            },
          },
        },
        responses: { 200: { description: "Rôle modifié" }, 403: errorResponse("Réservé au super admin") },
      },
    },
    "/users/{id}/disable": {
      patch: {
        tags: ["Users"],
        summary: "Désactiver un compte et couper ses sessions, journalisé",
        security: bearer,
        parameters: [idParam],
        responses: { 200: { description: "Compte désactivé" }, 403: errorResponse("Interdit") },
      },
    },
    "/users/{id}/enable": {
      patch: {
        tags: ["Users"],
        summary: "Réactiver un compte, journalisé",
        security: bearer,
        parameters: [idParam],
        responses: { 200: { description: "Compte réactivé" }, 403: errorResponse("Interdit") },
      },
    },
    "/audit-logs": {
      get: {
        tags: ["Audit"],
        summary: "Consulter les audit logs (ADMIN, SUPER_ADMIN)",
        security: bearer,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "actorId", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Page de logs" }, 403: errorResponse("Rôle insuffisant") },
      },
    },
  },
};