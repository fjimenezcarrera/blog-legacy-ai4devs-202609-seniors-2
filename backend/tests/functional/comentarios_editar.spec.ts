import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { unComentario, unPostPublicado } from '#tests/fixtures/blog'

/**
 * Caracterización de PATCH /comentarios/:id: fija lo que el endpoint hace HOY,
 * con sus bugs.
 */
async function cuerpoGuardado(id: number) {
  const fila = await db.from('comentarios').where('id', id).first()
  return fila.cuerpo
}

test.group('PATCH /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(async () => {
    await db.table('posts').insert(unPostPublicado())
  })

  test('el autor edita su comentario pendiente y recibe la fila completa', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), {
      comentario: {
        id: 9101,
        post_id: 9001,
        autor_nombre: 'Ana Cortés',
        autor_email: 'ana.cortes@ejemplo.es',
        cuerpo: 'Cuerpo corregido.',
        estado: 'pendiente',
        creado_en: '2026-03-15 10:12:00',
        padre_id: null,
      },
    })
    assert.equal(await cuerpoGuardado(9101), 'Cuerpo corregido.')
  })

  test('BUG caracterizado (#9): acepta un cuerpo de un solo carácter', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'x' })

    // Assert
    respuesta.assertStatus(200)
    assert.equal(await cuerpoGuardado(9101), 'x')
  })

  test('devuelve 404 si el comentario no existe', async ({ client, assert }) => {
    // Act
    const respuesta = await client
      .patch('/comentarios/999999')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })

  test('BUG caracterizado (#10): distingue mayúsculas en el correo y devuelve 403', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'Ana.Cortes@ejemplo.es', cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(9101), 'Un comentario de prueba.')
  })

  test('no deja editar un comentario aprobado aunque el correo coincida', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es', cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(9101), 'Un comentario de prueba.')
  })

  test('BUG caracterizado (#10): la clave de moderación no sirve para editar', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .header('x-clave-moderacion', 'dev-secret-cambiar')
      .json({ cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })

  test('sin correo devuelve 403', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.patch('/comentarios/9101').json({ cuerpo: 'Cuerpo corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })

  test('sin cuerpo devuelve 400 y no toca la fila', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'Falta el cuerpo' })
    assert.equal(await cuerpoGuardado(9101), 'Un comentario de prueba.')
  })

  test('comprueba el permiso antes que el cuerpo', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })
})
