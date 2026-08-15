import { Controller, Get, NotFoundException, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { EditionsService } from '../editions/editions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { loadActiveSession, type SessionClaims } from '../identity-access/active-session';
import { Public } from '../../common/decorators/public.decorator';
import { PublicSiteService, type ViewerContext } from './public-site.service';

/**
 * Everything the visitor-facing site reads. Kept in one controller so the
 * order of the routes is visible in one place — `/editions/latest` has to be
 * declared before `/editions/:slug` or it would be read as a slug.
 */
@ApiTags('public')
@Controller()
export class PublicSiteController {
  constructor(
    private readonly site: PublicSiteService,
    private readonly editions: EditionsService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('editions')
  @ApiOperation({ summary: 'Every year the public may see, newest first' })
  list() {
    return this.editions.listPublic();
  }

  @Public()
  @Get('editions/latest')
  @ApiOperation({ summary: 'The newest published year — what the nav points at' })
  async latest() {
    const edition = await this.editions.findLatestPublished();
    if (!edition) throw new NotFoundException('No published edition yet');
    return edition;
  }

  @Public()
  @Get('editions/latest-winners')
  @ApiOperation({ summary: 'The newest year that has winners — the homepage strip' })
  async latestWinners() {
    const edition = await this.editions.findLatestWithWinners();
    if (!edition) throw new NotFoundException('No edition has announced winners yet');
    return edition;
  }

  @Public()
  @Get('editions/accepting-submissions')
  @ApiOperation({ summary: 'The year currently collecting entries, or null' })
  accepting() {
    return this.editions.findAcceptingSubmissions();
  }

  @Public()
  @Get('editions/:slug')
  @ApiQuery({ name: 'preview', required: false, description: 'Preview token for an unpublished year' })
  @ApiOperation({ summary: 'A whole year page: categories, nominees, panel and sponsors' })
  async edition(@Param('slug') slug: string, @Req() req: Request, @Query('preview') preview?: string) {
    return this.site.edition(slug, await this.viewer(req, preview));
  }

  @Public()
  @Get('editions/:slug/categories/:categorySlug')
  @ApiQuery({ name: 'preview', required: false })
  @ApiOperation({ summary: 'One category of one year' })
  async category(
    @Param('slug') slug: string,
    @Param('categorySlug') categorySlug: string,
    @Req() req: Request,
    @Query('preview') preview?: string,
  ) {
    return this.site.category(slug, categorySlug, await this.viewer(req, preview));
  }

  @Public()
  @Get('winners')
  @ApiOperation({ summary: 'The hall of winners, every year that has announced results' })
  winners() {
    return this.site.winners();
  }

  @Public()
  @Get('submission-form')
  @ApiOperation({ summary: 'The open year and its categories, or null when the form is closed' })
  submissionForm() {
    return this.site.submissionForm();
  }

  @Public()
  @Get('creator-suggestions')
  @ApiQuery({ name: 'q', required: true, description: 'At least two characters' })
  @ApiOperation({ summary: 'Name suggestions for the public form, to curb spelling variants' })
  creatorSuggestions(@Query('q') q = '') {
    return this.site.creatorSuggestions(q);
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Running totals for the homepage: years, categories, creators' })
  stats() {
    return this.site.stats();
  }

  @Public()
  @Get('creators/:slug')
  @ApiOperation({ summary: 'A creator profile and the years they appear in' })
  creator(@Param('slug') slug: string) {
    return this.site.creator(slug);
  }

  @Public()
  @Get('sitemap-entries')
  @ApiOperation({ summary: 'Every public URL, for building sitemap.xml' })
  sitemap() {
    return this.site.sitemapEntries();
  }

  /**
   * These routes are public, so the global auth guard is skipped and no user
   * is attached. An admin reading a draft still needs to be recognised, so the
   * bearer token is decoded here when one happens to be present — a bad or
   * missing token simply means "not an admin", never an error.
   *
   * It used to stop at the signature, which is the weakest thing a token can
   * prove. Signing out, changing a password and deleting an account all end a
   * session without touching the token, so an admin who had signed out could
   * still open an unannounced year for the fifteen minutes until it expired —
   * on the pages that hold the winners before anyone is told. The same check
   * the signed-in routes use decides it now.
   */
  private async viewer(req: Request, previewToken?: string): Promise<ViewerContext> {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!bearer) return { isAdmin: false, previewToken };

    let claims: SessionClaims;
    try {
      claims = this.jwt.verify<SessionClaims>(bearer, { secret: process.env.JWT_SECRET });
    } catch {
      return { isAdmin: false, previewToken };
    }

    const session = await loadActiveSession(this.prisma, claims);
    return { isAdmin: session !== null, previewToken };
  }
}
