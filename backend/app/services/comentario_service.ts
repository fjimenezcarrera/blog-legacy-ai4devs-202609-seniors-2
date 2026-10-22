import { inject } from '@adonisjs/core'
import type Comentario from '#models/comentario'
import { ComentarioRepository } from '#repositories/comentario_repository'
import AccionNoPermitidaException from '#exceptions/accion_no_permitida_exception'
import RecursoNoEncontradoException from '#exceptions/recurso_no_encontrado_exception'

/**
 * BUG caracterizado (#4): la clave de moderación está escrita en el código. Se conserva
 * en el refactor; sacarla a variables de entorno (y rotarla) es una tarea aparte.
 */
const CLAVE_MODERACION = 'dev-secret-cambiar'

export type NuevoComentario = {
  autor_nombre: string
  autor_email: string
  cuerpo: string
  padre_id?: number | null
}

export type CredencialesDeComentario = {
  autorEmail?: string | null
  claveModeracion?: string | null
}

/**
 * Las reglas de negocio de los comentarios: quién puede borrar, quién puede editar y
 * cómo nace un comentario.
 */
@inject()
export class ComentarioService {
  constructor(protected comentarios: ComentarioRepository) {}

  async buscarPostPublicado(slug: string) {
    const postId = await this.comentarios.buscarIdDePostPublicado(slug)
    if (postId === null) {
      throw new RecursoNoEncontradoException('Post no encontrado')
    }
    return postId
  }

  async crear(postId: number, datos: NuevoComentario) {
    await this.comentarios.crear({
      postId,
      autorNombre: datos.autor_nombre,
      autorEmail: datos.autor_email,
      cuerpo: datos.cuerpo,
      estado: 'pendiente',
      creadoEn: new Date().toISOString().slice(0, 19).replace('T', ' '),
      padreId: datos.padre_id ?? null,
    })
    return this.comentarios.ultimoCreado()
  }

  /**
   * Borra quien lo escribió (correo sin distinguir mayúsculas ni espacios) o quien
   * traiga la clave de moderación.
   */
  async borrar(id: number | string, credenciales: CredencialesDeComentario) {
    const comentario = await this.buscar(id)

    const esModerador = credenciales.claveModeracion === CLAVE_MODERACION
    const esAutor =
      String(comentario.autorEmail).toLowerCase().trim() ===
      String(credenciales.autorEmail ?? '').toLowerCase().trim()
    if (!esModerador && !esAutor) {
      throw new AccionNoPermitidaException('No puedes borrar este comentario')
    }

    await this.comentarios.borrar(comentario)
    return comentario
  }

  /**
   * BUG caracterizado (#10): la regla de edición no es la de borrado. Compara el correo
   * tal cual, no admite la clave de moderación y exige que el comentario siga pendiente.
   */
  async comprobarEdicion(id: number | string, autorEmail?: string | null) {
    const comentario = await this.buscar(id)
    if (comentario.autorEmail !== (autorEmail ?? '') || comentario.estado !== 'pendiente') {
      throw new AccionNoPermitidaException('No puedes editar este comentario')
    }
    return comentario
  }

  async editar(comentario: Comentario, cuerpo: string) {
    await this.comentarios.cambiarCuerpo(comentario, cuerpo)
    return this.buscar(comentario.id)
  }

  private async buscar(id: number | string) {
    const comentario = await this.comentarios.buscarPorId(id)
    if (!comentario) {
      throw new RecursoNoEncontradoException('Comentario no encontrado')
    }
    return comentario
  }
}
