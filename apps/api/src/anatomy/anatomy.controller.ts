import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AnatomyService } from './anatomy.service';
import {
  annotationListQuerySchema,
  annotationStatusBodySchema,
  createAnnotationBodySchema,
  structureListQuerySchema,
  updateAnnotationBodySchema,
  voidAnnotationBodySchema,
  type AnnotationListQuery,
  type AnnotationStatusBody,
  type CreateAnnotationBody,
  type StructureListQuery,
  type UpdateAnnotationBody,
  type VoidAnnotationBody,
} from './anatomy.schemas';

@ApiTags('anatomy')
@ApiBearerAuth()
@Controller()
export class AnatomyController {
  constructor(private readonly anatomy: AnatomyService) {}

  @Get('anatomy/structures')
  @RequirePermissions(PERMISSIONS.ANATOMY_READ)
  listStructures(
    @Query(new ZodValidationPipe(structureListQuerySchema)) query: StructureListQuery,
  ) {
    return this.anatomy.listStructures(query);
  }

  @Get('anatomy/structures/:id')
  @RequirePermissions(PERMISSIONS.ANATOMY_READ)
  getStructure(@Param('id', ParseUUIDPipe) id: string) {
    return this.anatomy.getStructure(id);
  }

  @Get('anatomy/models')
  @RequirePermissions(PERMISSIONS.ANATOMY_MODEL_READ)
  listModels() {
    return this.anatomy.listModels();
  }

  @Get('anatomy/models/:id')
  @RequirePermissions(PERMISSIONS.ANATOMY_MODEL_READ)
  getModel(@Param('id', ParseUUIDPipe) id: string) {
    return this.anatomy.getModel(id);
  }

  @Get('anatomy/models/:modelId/active-version')
  @RequirePermissions(PERMISSIONS.ANATOMY_MODEL_READ)
  exactActiveVersion(@Param('modelId', ParseUUIDPipe) modelId: string) {
    return this.anatomy.getActiveVersion(modelId);
  }

  @Get('anatomy/models/:modelId/versions/active')
  @RequirePermissions(PERMISSIONS.ANATOMY_MODEL_READ)
  activeVersion(@Param('modelId', ParseUUIDPipe) modelId: string) {
    return this.anatomy.getActiveVersion(modelId);
  }

  @Get('anatomy/model-versions/:versionId/mappings')
  @RequirePermissions(PERMISSIONS.ANATOMY_READ, PERMISSIONS.ANATOMY_MODEL_READ)
  mappings(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.anatomy.listMappings(versionId);
  }

  @Get('body-annotations/:id')
  @RequirePermissions(PERMISSIONS.BODY_ANNOTATION_READ)
  getAnnotation(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.anatomy.getAnnotation(principal, id);
  }

  @Get('patients/:patientId/body-annotations')
  @RequirePermissions(PERMISSIONS.BODY_ANNOTATION_READ)
  list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query(new ZodValidationPipe(annotationListQuerySchema)) query: AnnotationListQuery,
  ) {
    return this.anatomy.listAnnotations(principal, patientId, query);
  }

  @Post('patients/:patientId/body-annotations')
  @RequirePermissions(PERMISSIONS.BODY_ANNOTATION_CREATE)
  @ApiOperation({
    summary: 'Create a clinical body annotation on a reviewed versioned surface anchor',
  })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body(new ZodValidationPipe(createAnnotationBodySchema)) body: CreateAnnotationBody,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.anatomy.create(principal, patientId, body, requestId ?? 'unknown');
  }

  @Patch('body-annotations/:id')
  @RequirePermissions(PERMISSIONS.BODY_ANNOTATION_UPDATE)
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateAnnotationBodySchema)) body: UpdateAnnotationBody,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.anatomy.update(principal, id, body, requestId ?? 'unknown');
  }

  @Post('body-annotations/:id/resolve')
  @RequirePermissions(PERMISSIONS.BODY_ANNOTATION_RESOLVE)
  resolve(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(annotationStatusBodySchema)) body: AnnotationStatusBody,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.anatomy.resolve(principal, id, body, requestId ?? 'unknown');
  }

  @Post('body-annotations/:id/void')
  @RequirePermissions(PERMISSIONS.BODY_ANNOTATION_VOID)
  void(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(voidAnnotationBodySchema)) body: VoidAnnotationBody,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.anatomy.void(principal, id, body, requestId ?? 'unknown');
  }

  @Get('patients/:patientId/body-map')
  @RequirePermissions(
    PERMISSIONS.ANATOMY_READ,
    PERMISSIONS.ANATOMY_MODEL_READ,
    PERMISSIONS.BODY_ANNOTATION_READ,
  )
  bodyMap(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.anatomy.getBodyMap(principal, patientId);
  }

  @Get('encounters/:encounterId/body-annotations')
  @RequirePermissions(PERMISSIONS.BODY_ANNOTATION_READ)
  encounterAnnotations(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.anatomy.listEncounterAnnotations(principal, encounterId);
  }
}
