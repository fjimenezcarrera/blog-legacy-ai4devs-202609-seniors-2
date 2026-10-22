import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * handler.ts traduce los errores de validación de comentarios a sus formatos legacy.
 * Este test fija que el resto de validadores sigue respondiendo con el formato de
 * AdonisJS por defecto.
 */
test.group('Errores de validación fuera de comentarios', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('el registro sin datos responde 422 con {errors} de VineJS', async ({ client, assert }) => {
    // Act
    const respuesta = await client.post('/api/v1/auth/signup').json({})

    // Assert
    respuesta.assertStatus(422)
    const cuerpo = respuesta.body()
    assert.deepEqual(Object.keys(cuerpo), ['errors'])
    assert.isArray(cuerpo.errors)
    assert.includeDeepMembers(
      cuerpo.errors.map((e: { field: string; rule: string }) => ({ field: e.field, rule: e.rule })),
      [
        { field: 'email', rule: 'required' },
        { field: 'password', rule: 'required' },
      ]
    )
    assert.notProperty(cuerpo, 'error')
    assert.notProperty(cuerpo, 'message')
  })
})
