import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { unComentario, unPostPublicado } from '#tests/fixtures/blog'

/**
 * Caracterización de DELETE /comentarios/:id: fija lo que el endpoint hace HOY,
 * con sus bugs.
 */
async function existeComentario(id: number) {
  return Boolean(await db.from('comentarios').where('id', id).first())
}

test.group('DELETE /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(async () => {
    await db.table('posts').insert(unPostPublicado())
  })

  test('el autor lo borra con su correo y recibe 200 {borrado: true}', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existeComentario(9101))
  })

  test('compara el correo sin distinguir mayúsculas ni espacios', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: '  Ana.Cortes@EJEMPLO.es ' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existeComentario(9101))
  })

  test('acepta el correo en la query string', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .qs({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.isFalse(await existeComentario(9101))
  })

  test('BUG caracterizado (#4): la clave de moderación escrita en el código basta para borrar', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', 'dev-secret-cambiar')

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existeComentario(9101))
  })

  test('borra comentarios aprobados, no solo pendientes', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.isFalse(await existeComentario(9101))
  })

  test('con una clave incorrecta y sin correo devuelve 403', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', 'otra-clave')

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existeComentario(9101))
  })

  test('con el correo de otra persona devuelve 403', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existeComentario(9101))
  })

  test('sin correo ni clave devuelve 403', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete('/comentarios/9101')

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existeComentario(9101))
  })

  test('devuelve 404 si el comentario no existe', async ({ client, assert }) => {
    // Act
    const respuesta = await client
      .delete('/comentarios/999999')
      .header('x-clave-moderacion', 'dev-secret-cambiar')

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })

  test('BUG caracterizado (#8): borrar un padre deja sus respuestas huérfanas', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())
    await db
      .table('comentarios')
      .insert(unComentario({ id: 9102, padre_id: 9101, autor_email: 'marta.ruiz@corriente.es' }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'ana.cortes@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.isFalse(await existeComentario(9101))
    const respuestaHuerfana = await db.from('comentarios').where('id', 9102).first()
    assert.equal(respuestaHuerfana.padre_id, 9101)
  })
})
