import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, type CalendarBlockListResponse, type CalendarBlockResponse } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { blockQuerySchema, createBlockSchema, updateBlockSchema, type BlockQuery, type CreateBlock, type UpdateBlock } from './calendar-blocks.schemas';
import { CalendarBlocksService } from './calendar-blocks.service';
@ApiTags('calendar-blocks') @ApiBearerAuth() @Controller('calendar-blocks')
export class CalendarBlocksController {
  constructor(private readonly blocks: CalendarBlocksService) {}
  @Get() @RequirePermissions(PERMISSIONS.APPOINTMENT_READ) list(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query(new ZodValidationPipe(blockQuerySchema)) q: BlockQuery): Promise<CalendarBlockListResponse> { return this.blocks.list(p, q); }
  @Post() @RequirePermissions(PERMISSIONS.APPOINTMENT_CREATE) create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body(new ZodValidationPipe(createBlockSchema)) b: CreateBlock, @Headers('x-request-id') r?: string): Promise<CalendarBlockResponse> { return this.blocks.create(p, b, r ?? 'unknown'); }
  @Patch(':id') @RequirePermissions(PERMISSIONS.APPOINTMENT_UPDATE) update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateBlockSchema)) b: UpdateBlock, @Headers('x-request-id') r?: string): Promise<CalendarBlockResponse> { return this.blocks.update(p, id, b, r ?? 'unknown'); }
  @Delete(':id') @RequirePermissions(PERMISSIONS.APPOINTMENT_CANCEL) remove(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string, @Headers('x-request-id') r?: string): Promise<void> { return this.blocks.remove(p, id, r ?? 'unknown'); }
}
