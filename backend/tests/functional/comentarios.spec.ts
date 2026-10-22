import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { CAMPOS_COMENTARIO, unPostPublicado } from '#tests/fixtures/blog'

/**
 * Caracterización de POST /posts/:slug/comentarios: fija lo que el endpoint hace HOY,
 * con sus bugs. Los marcados como «BUG caracterizado» son comportamiento que se
 * conserva a propósito durante el refactor y que se corregirá en una tarea aparte.
 */
const comentarioValido = {
  autor_nombre: 'Lucía Ferrer',
  autor_email: 'lucia.ferrer@ejemplo.es',
  cuerpo: 'Un comentario suficientemente largo.',
}

async function contarComentarios() {
  const [{ total }] = await db.from('comentarios').count('* as total')
  return Number(total)
}

test.group('POST /posts/:slug/comentarios', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('deja un comentario pendiente y devuelve 201 con la fila completa', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json(comentarioValido)

    // Assert
    respuesta.assertStatus(201)
    const cuerpo = respuesta.body()
    assert.deepEqual(Object.keys(cuerpo), ['comentario'])
    const comentario = cuerpo.comentario
    assert.sameMembers(Object.keys(comentario), CAMPOS_COMENTARIO)
    assert.isNumber(comentario.id)
    assert.deepInclude(comentario, {
      post_id: 9001,
      autor_nombre: 'Lucía Ferrer',
      cuerpo: 'Un comentario suficientemente largo.',
      estado: 'pendiente',
      padre_id: null,
    })
    assert.isString(comentario.estado)
    assert.notProperty(comentario, 'created_at')
    assert.notProperty(comentario, 'updated_at')

    const guardado = await db.from('comentarios').where('id', comentario.id).first()
    assert.equal(guardado.post_id, 9001)
    assert.equal(guardado.estado, 'pendiente')
  })

  test('guarda creado_en en UTC con formato «AAAA-MM-DD HH:MM:SS»', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json(comentarioValido)

    // Assert
    respuesta.assertStatus(201)
    const creadoEn = respuesta.body().comentario.creado_en
    assert.match(creadoEn, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    const comoUtc = Date.parse(creadoEn.replace(' ', 'T') + 'Z')
    assert.isBelow(Math.abs(Date.now() - comoUtc), 60_000)
  })

  test('BUG caracterizado (regla 6): la respuesta devuelve el autor_email de quien comenta', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json(comentarioValido)

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.autor_email, 'lucia.ferrer@ejemplo.es')
  })

  test('BUG caracterizado (#7): guarda un padre_id que no existe sin comprobarlo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, padre_id: 424242 })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 424242)
  })

  test('acepta un cuerpo de exactamente 5 caracteres', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, cuerpo: 'Hola!' })

    // Assert
    respuesta.assertStatus(201)
    respuesta.assertBodyContains({ comentario: { cuerpo: 'Hola!' } })
  })

  test('un cuerpo de solo espacios llega recortado y cuenta como corto', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, cuerpo: '     ' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
  })

  test('devuelve 404 si el post no existe', async ({ client, assert }) => {
    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json(comentarioValido)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })

  test('devuelve 404 si el post está en borrador', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado({ estado: 'borrador' }))
    const antes = await contarComentarios()

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json(comentarioValido)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
    assert.equal(await contarComentarios(), antes)
  })

  test('comprueba el post antes que la entrada', async ({ client, assert }) => {
    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({})

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })

  test('sin nombre devuelve 400 con {error}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, autor_nombre: undefined })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
    assert.equal(await contarComentarios(), antes)
  })

  test('con el nombre vacío devuelve 400 con {error}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, autor_nombre: '' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
  })

  test('BUG caracterizado (#11): sin correo devuelve 422 con {message}', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, autor_email: undefined })

    // Assert
    respuesta.assertStatus(422)
    assert.deepEqual(respuesta.body(), { message: 'Falta el email' })
    assert.equal(await contarComentarios(), antes)
  })

  test('BUG caracterizado (#11): un correo sin @ devuelve 400 con {errores: [...]}', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, autor_email: 'lucia.ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { errores: ['email no válido'] })
    assert.equal(await contarComentarios(), antes)
  })

  test('BUG caracterizado (#12): un correo como «@» se acepta', async ({ client }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, autor_email: '@' })

    // Assert
    respuesta.assertStatus(201)
  })

  test('BUG caracterizado (#11): un cuerpo corto devuelve 200 con {ok: false} y no guarda nada', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    const antes = await contarComentarios()

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, cuerpo: 'Hola' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
    assert.equal(await contarComentarios(), antes)
  })

  test('sin cuerpo devuelve 200 con {ok: false}', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...comentarioValido, cuerpo: undefined })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
  })

  test('valida en orden: el nombre va antes que el correo y el cuerpo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({})

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
  })

  test('valida en orden: el correo va antes que el cuerpo', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ autor_nombre: 'Lucía Ferrer', autor_email: 'sin-arroba', cuerpo: 'x' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { errores: ['email no válido'] })
  })
})
