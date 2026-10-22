import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    comentarios: {
      columns: {
        // La API devuelve hoy el texto tal cual se guardó («AAAA-MM-DD HH:MM:SS», en UTC).
        // Como DateTime saldría en ISO y cambiaría el contrato.
        creado_en: { tsType: 'string', decorator: '@column()' },
      },
    },
  },
} satisfies SchemaRules
