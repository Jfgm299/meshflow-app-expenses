import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TrustedUserGuard } from "../core/trusted-user.guard";
import { ApiTrustedCoreUser } from "../core/openapi-security";
import type { TrustedUserRequest, UserContext } from "../core/user-context";
import { AnalyticsService } from "./analytics.service";
import type {
  AnalyticsAccountGroup,
  AnalyticsCashflow,
  AnalyticsCategoryGroup,
  AnalyticsForecast,
  AnalyticsOverview,
  AnalyticsRecurringImpact,
  AnalyticsTimelineBucket,
  AnalyticsUpcomingItem
} from "./analytics.types";
import type { TransactionRecord } from "../transactions/transactions.types";

const getTrustedUserContext = (request: TrustedUserRequest): UserContext => {
  if (!request.userContext) {
    throw new Error("Trusted user context was not attached to the request");
  }

  return request.userContext;
};

@ApiTags("analytics")
@ApiTrustedCoreUser()
@UseGuards(TrustedUserGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Summarize caller-owned Finance activity" })
  @ApiOkResponse({ description: "Income, expense, net cashflow, transaction and upcoming counts." })
  overview(@Req() request: TrustedUserRequest): Promise<AnalyticsOverview> {
    return this.analyticsService.overview(getTrustedUserContext(request));
  }

  @Get("cashflow")
  @ApiOperation({ summary: "Summarize caller-owned cashflow for a date range" })
  @ApiOkResponse({ description: "Income, expense and net cashflow totals." })
  cashflow(@Req() request: TrustedUserRequest, @Query("from") from?: string, @Query("to") to?: string): Promise<AnalyticsCashflow> {
    return this.analyticsService.cashflow(getTrustedUserContext(request), { from, to });
  }

  @Get("by-category")
  @ApiOperation({ summary: "Group caller-owned transactions by category and type" })
  @ApiOkResponse({ description: "Category/type totals for matching transactions." })
  byCategory(@Req() request: TrustedUserRequest, @Query("from") from?: string, @Query("to") to?: string): Promise<AnalyticsCategoryGroup[]> {
    return this.analyticsService.byCategory(getTrustedUserContext(request), { from, to });
  }

  @Get("by-account")
  @ApiOperation({ summary: "Group caller-owned transactions by account" })
  @ApiOkResponse({ description: "Account totals with available account metadata." })
  byAccount(@Req() request: TrustedUserRequest, @Query("from") from?: string, @Query("to") to?: string): Promise<AnalyticsAccountGroup[]> {
    return this.analyticsService.byAccount(getTrustedUserContext(request), { from, to });
  }

  @Get("timeline")
  @ApiOperation({ summary: "Bucket caller-owned transaction cashflow by day" })
  @ApiOkResponse({ description: "Daily buckets with income, expense and net totals." })
  timeline(@Req() request: TrustedUserRequest, @Query("from") from?: string, @Query("to") to?: string): Promise<AnalyticsTimelineBucket[]> {
    return this.analyticsService.timeline(getTrustedUserContext(request), { from, to });
  }

  @Get("top-expenses")
  @ApiOperation({ summary: "Return top caller-owned expenses by amount" })
  @ApiOkResponse({ description: "Expense transactions sorted by amount descending." })
  topExpenses(@Req() request: TrustedUserRequest, @Query("from") from?: string, @Query("to") to?: string, @Query("limit") limit?: string): Promise<TransactionRecord[]> {
    return this.analyticsService.topExpenses(getTrustedUserContext(request), { from, to, limit });
  }

  @Get("top-income")
  @ApiOperation({ summary: "Return top caller-owned income by amount" })
  @ApiOkResponse({ description: "Income transactions sorted by amount descending." })
  topIncome(@Req() request: TrustedUserRequest, @Query("from") from?: string, @Query("to") to?: string, @Query("limit") limit?: string): Promise<TransactionRecord[]> {
    return this.analyticsService.topIncome(getTrustedUserContext(request), { from, to, limit });
  }

  @Get("upcoming")
  @ApiOperation({ summary: "Return upcoming scheduled and recurring Finance items" })
  @ApiOkResponse({ description: "Pending scheduled transactions and active recurring occurrences sorted by due date." })
  upcoming(@Req() request: TrustedUserRequest, @Query("from") from?: string, @Query("to") to?: string): Promise<AnalyticsUpcomingItem[]> {
    return this.analyticsService.upcoming(getTrustedUserContext(request), { from, to });
  }

  @Get("recurring-impact")
  @ApiOperation({ summary: "Summarize active recurring monthly-equivalent impact" })
  @ApiOkResponse({ description: "Monthly-equivalent recurring income, expense and net totals." })
  recurringImpact(@Req() request: TrustedUserRequest): Promise<AnalyticsRecurringImpact> {
    return this.analyticsService.recurringImpact(getTrustedUserContext(request));
  }

  @Get("forecast")
  @ApiOperation({ summary: "Forecast balances from current balances and upcoming items" })
  @ApiOkResponse({ description: "Deterministic simple forecast over the requested date range or horizon." })
  forecast(
    @Req() request: TrustedUserRequest,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("horizonDays") horizonDays?: string
  ): Promise<AnalyticsForecast> {
    return this.analyticsService.forecast(getTrustedUserContext(request), { from, to, horizonDays });
  }
}
