# Context

This document describes all the requirements for the delivery of a state-of-the-art inventory aggregation and distribution solution, including data sourcing, calculations, and outputs to be created. It covers both functional and technical requirements.

The system will be owned and operated by a licensed prime broker (the bank) operating in all jurisdictions across all regions. The broker will facilitate various types of activities to counterparties including, but not limited to:

- Agency trading

- Margin trading of equities and bonds

- Short selling

- Derivatives underwriting and trading

- Swaps

- Options

- Forwards

- Securities lending

- Repurchase agreements

- The bank needs to comply with individual, and at times conflicting regulatory requirements for each jurisdiction. All calculations need to be customizable to incorporate both current and future regulations as well as business preferences.

  The goal of this project is to deliver a high-performance, highly scalable enterprise application capable of collecting massive amounts of data and performing real time and on demand calculations of global inventory data, as well as publish data to downstream systems for further processing.

  The application also needs to provide a rich and customizable UI for users to visualize all its internal data.

- # Input Data

This section details all the data that needs to be ingested by the system and attributes necessary for successful inventory tracking.

## Reference Data

### Security Details

The system needs to receive security referential data for all bonds (sovereign, municipal, corporate, convertibles), equities (common and preferential shares), basket products with composition (ETF, indexes).

Data needs to be received in a regular batch, performed weekly on Sunday outside of business hours, and have a feed of events notifying of new products or changes in real-time.

- When performing a batch load of data on Sunday the system needs to reconcile the retrieved securities with the ones already in the system and update them if necessary, but not change them if they are identical. Version of these securities must match the latest version specified by the provider of the data.

- When receiving real-time updates intraday the system should update the corresponding security and match the version number to that provided by the provider of the record.

- The system needs to receive and combine data from Reuters and Bloomberg for bonds and equities, and MarkIT, Ultumus, and RIMES for ETF and index data. The attributes of these data sources for the same records need to be combined intelligently so that the system can understand how these securities are referenced across different providers and types of identifiers.

- Securities need to have a unique, internal identifier that is used to normalize all other data to the same record set. They also need to track all other industry identifiers associated with them to assist in data mapping and user visualization.

- Conflicts when mapping securities need to be reported in as an exception to authorized users to that they can be handled manually. More in exception reporting later in this document.

- ### Counterparties

  The inventory management system needs to receive counterparty details for all counterparties the bank trades with. Those counterparties will include:

  \- Internal

  \- Clients

  \- Client Agents

  \- Brokers

  \- Advisors

  \- Custodians

  \- Operations Partners

  Each counterparty will share some common details:

  \- Corporate identification data as required by local and international regulation.

  \- List of contacts linked to the counterparty with their contact information (email address, phone number, Bloomberg terminal ID, Symphony ID)

  \- Parent/child relationship to other counterparties. The system needs to track parent companies that will in turn have multiple legal entities with trading activity with the bank.

  \- KYC status (not started, in progress, under review, in dispute, complete)

  \- Counterparty status (new, under review, approved, active, suspended, terminated)

  \- One special internal counterparty is the bank itself. All internal books and internal trades will be associated with that internal counterparty. There will be other internal counterparties for legal entities of the bank.

  All counterparties will have a unique identifier that will be associated with all their accounts, and trading activity.

### Index Composition

For basket products, such as ETF and indexes, the system needs to receive a list of constituents of the basket and their respective weights. For ETFs specifically there needs to be a list of constituents for pricing and a list of constituents for creation/redemption, as they may have different weights.

### Aggregation Units

Aggregation units are arbitrary subdivisions of a legal entity for trade reporting purposes and activity segregation. In markets in the Americas and Europe they do not have a business critical function and all activities in a legal entity can be linked to a single aggregation unit, but in certain Asian-Pacific markets each legal entity may have multiple aggregation units for specific purposes, such as segregating client long sell activity from firms own short sell needs, or isolate fully paid accounts from other activity.

The system needs to receive a feed of aggregation units that contain the following attributes:

- Aggregation unit name

- ID

- Type (long, short, net)

- Market (each aggregation unit can belong to only one market and the aggregation unit name needs to be unique within that market)

- Officer of record for the aggregation unit

## Market Data

The system will receive market data to be used for calculations. The most important items of market data are:

### Prices

The system will receive two feeds of prices for securities:

- Official close prices for bonds and equities

- Official close prices for indexes and ETF

- WMCO FX rates

- Live ticking prices for all securities.

- Premium prices for exchange-traded derivatives

The system needs to store all live prices in a purpose-built tick database to be queried for calculations by the system. Each tick in the tick database needs to be accompanied by source, timestamp, and any other relevant information.

### Basket NAV

For indexes and ETF the system needs to receive a feed of NAV (once a day) and iNAV (real-time) and those need to be stored for all basket products.

### Volatility Data

The system needs to receive a feed of volatility curves for all securities in scope.

## Trade Data

### Cash Equities and Fixed Income Trading Activity

The system will receive one or more feeds of start of day positions for all books. The feed will be delivered in early hours ahead of business activity and once received, will become the current snapshot of positions for that book.

All positions need to provide the following quantities:

- Current contractual quantity

- Current settled quantity

- Expected receipts and deliveries for each day including today.

- Book that the position belongs to.

- ### Trades

The system needs to receive real time orders and executions from the multiple trading systems. All orders will contain the following attributes:

- Order ID

- Security ID

- Counterparty ID for the buyer

- Counterparty ID for the seller

- Side (buy, sell, short sell)

- Price

- Order Type (limit, market)

- Order Date

- Parent order (if any)

Executions need to track the following attributes:

- Order ID

- Execution ID

- Price

- Quantity

### Depot Positions

While not a requirement for all markets, some markets will require the processing of a set of depot positions to be used to satisfy regulatory requirements (i.e. Taiwan custodian reservations), therefore the system must support the retrieval of a feed of depot positions from custodians or internal back office for these purposes.

These depot positions are expected to be received once daily either before midnight for the next business day, or after midnight for the current day.

### Security Financing Contracts

The system needs to receive a real-time feed of all security financing contracts including:

- Stock borrow/loan contracts

- Repurchase agreements

- Collateral pledges (both receipt and delivery)

All those contracts need to have the relevant details to identify:

- Contract type

- Associated counterparties

- Collateral required for that contract (cash, securities, none)

- Borrow rate

- Effective date

- Expiry date

### Swap Contracts

The system needs to receive a feed of all swap contracts and their associated positions in real time. The swap contracts need to include the following details:

- Swap ID

- Underwriter counterparty

- Purchasing counterparty

- Effective date

- Expiry date

- Financing rate

Each swap will also have one or more positions, whose attributes must include:

- Security ID

- Quantity

- Settled Quantity

- Pending settlement deliveries and receipts for each day in the future

- Average price

### External Availabilities

The system will receive multiple feeds of external lender availabilities and needs to retain those. The details necessary for those are:

- Lender counterparty ID

- Security ID

- Quantity

- Type (indicative, firm, exclusive)

- Borrow rate

- Effective date

# Calculations

All inventory data needs to be available for applications to consume in multiple views, tailored for specific use cases. While the views proposed below are an initial set that is necessary to support other requirements listed in this document, it is not exhaustive and as business needs change, they can be modified or new views created. All these views consume the same underlying data, therefore ensuring consistency.

## Positions and settlement ladders

All positions captured must be made visible in real time. They must be filterable, pivotable, and aggregatable by attributes of the positions themselves:

- Book/Client/Counterparty/Depot/Tri-party agent

- Instrument

- Knowledge Date

- Effective Date

- Currency

- Stability

- Position Type (e.g. Client Segregated, Client Free (PB)/Client Clearance (IPB), Firm, Synthetic, Repo Pledge, Repo Received, SLAB Borrow, SLAB Loan, Pay-to-holds, Depot)

As well as by referential attributes including but not limited to:

- Asset Tier/Classification

- Asset Class (e.g. Bond, Equity)

- SLAB classification (e.g. HTB, GC)

- Market

- Index(es)

- Legal Entity

- Aggregation Unit

PB/IPB client positions must differentiate between total position quantity, total hypothecatable quantity, hypothecated quantity, and segregated quantity.

Depot positions must highlight both currently settled quantities, and projected receive and deliver quantities based on unsettled settlement activity.

Pay-to-holds and put-thrus must be easily identifiable as such and be accounted for in inventory calculations. Similarly collateral positions and positions held in tri-party agents must be included and clearly identified.

The quantity of a position due to a corporate action (e.g. split, reverse split, or stock dividend) must be readily visible and able to be included or excluded from position and calculation views. Also changes due to corporate actions must be reflected in real-time as they are booked in source systems. For corporate actions where the value date is not known, it must still be included in position calculations but highlighted that it does not yet have a settlement date.

Position projections must include the following:

- Projected Trade Date and Settlement Date positions based on current positions plus open orders

- Projected Depot positions based on current settled quantity plus unsettled activity

- Projected inventory based on the expiry of derivatives taking into account probability of that derivative being rolled

Additional views on underlying positions and transactions must be easy to create and update as the need is identified or based on new business use cases.

The positions must be calculated following the following rules:

| Term | Source | Formula | Comment |
| --- | --- | --- | --- |
| SecurityID | Latest SOD Position, Trades | SOD_POS.SecurityID or Trade.SecurityID | The identifier of the security in that position |
| BookID | Latest SOD Position, Trades | SOD_POS.BookID or Trade.BookID | The identifier of the book the position belongs to |
| Effective Date | Current business date |  | The date for which the position is being calculated |
| Knowledge Date | The date the position was calculated |  | The date the position was calculated |
| SOD TD QTY | Latest SOD position | = SOD_POS.TD_QTY | The contractual quantity of that position at SOD |
| SOD SD QTY | Latest SOD position | = SOD_POS.SD_QTY | The settled quantity of that position as confirmed by custodian |
| SD 0 Deliver | Lates SOD position, Trades | = SOD_POS.SD0_Deliver + SUM(Trade.Qty) where Trade.Side == Sell or Short Sell and Trade.SettlementDate = SD0 | Quantity expected to be delivered out to counterparties on SD0 |
| SD 0 Receipt | Latest SOD Position, Trades | = SOD_POS.SD0_Receipt + SUM(Trade.Qty) where Trade.Side == Buy and Trade.SettlementDate = SD0 | Quantity expected to be received on SD0 |
| SD 1 Deliver | Latest SOD Position, Trades | = SOD_POS.SD1_Deliver + SUM(Trade.Qty) where Trade.Side == Sell or Short Sell and Trade.SettlementDate = SD0Quantity expected to be received on SD1 |
| SD 1 Receipt | Latest SOD Position, Trades | = SOD_POS.SD0_Receipt + SUM(Trade.Qty) where Trade.Side == Buy and Trade.SettlementDate = SD1 | Quantity expected to be received on SD1 |
| SD 2 Deliver | Latest SOD Position, Trades | = SOD_POS.SD2_Deliver + SUM(Trade.Qty) where Trade.Side == Sell or Short Sell and Trade.SettlementDate = SD0Quantity expected to be received on SD2 | Quantity expected to be delivered out to counterparties on SD2 |
| SD 2 Receipt | Latest SOD Position, Trades | = SOD_POS.SD0_Receipt + SUM(Trade.Qty) where Trade.Side == Buy and Trade.SettlementDate = SD2 | Quantity expected to be received on SD2 |
| SD 3 Deliver | Latest SOD Position, Trades | = SOD_POS.SD3_Deliver + SUM(Trade.Qty) where Trade.Side == Sell or Short Sell and Trade.SettlementDate = SD0Quantity expected to be received on SD3 | Quantity expected to be delivered out to counterparties on SD3 |
| SD 3 Receipt | Latest SOD Position, Trades | = SOD_POS.SD0_Receipt + SUM(Trade.Qty) where Trade.Side == Buy and Trade.SettlementDate = SD3 | Quantity expected to be received on SD3 |
| SD 4 Deliver | Latest SOD Position, Trades | = SOD_POS.SD4_Deliver + SUM(Trade.Qty) where Trade.Side == Sell or Short Sell and Trade.SettlementDate = SD0Quantity expected to be received on SD4 | Quantity expected to be delivered out to counterparties on SD4 |
| SD 4 Receipt | Latest SOD Position, Trades | = SOD_POS.SD0_Receipt + SUM(Trade.Qty) where Trade.Side == Buy and Trade.SettlementDate = SD4 | Quantity expected to be received on SD4 |
| Intraday Buys | Trades | = SUM(Trade.Qty) where Trade.Side = Buy and Trade.TradeDate = T | The amount of that security bought today. |
| Intraday Sells | Trades | = SUM(Trade.Qty) where Trade.Side = Sell and Trade.TradeDate = T | The amount of that security long sold today |
| Intreaday Short Sells | Trades | = SUM(Trade.Qty) where Trade.Side = ShortSell and Trade.TradeDate = T | The amount of that security short sold today |

## Stock Borrow/Loan Positions

In addition to the fields defined in section above, stock borrow/loan position views must contain information including the following:

- Open Quantity

- Settlement Date Quantity

- Settled Quantity

- Recalled Quantity

- Returned Quantity

- Collateral schedule

Additional contract details must be available in the IMS to allow grouping, inclusion/exclusion, filtering by, including but not limited to:

- Dividend status

- Domestic/non-domestic

- Fee/Rate

- Collateral type

- External Availability

- External availability must be visible by the following:

- Lender

- Security

- Date

- Firm/Indicative

- Quantity

- Indicative Rate/Rebate when provided by lender

- Indicative stability

- Analytics on the lender availability and duration curves must be visible as well and used by all calculations based on external lender availability.

- ## Locates

- Locates must be visible by the following:

  - Requestor

  - Client code (where applicable)

  - Security

  - Long/Short sell locate

  - Request Timestamp

  - Response Timestamp

  - Requested Quantity

  - Approved Quantity

  - Decrement Quantity (where applicable)

  - Swap/Cash indicator (where applicable)

  - Calculations

  - 

  - In addition to making positions visible, the IMS must make calculations based on the current real-time view of positions and inventory available for query. Performing the calculations in the IMS allows the logic for each calculation to be defined in a single place and thus ensures the calculations are using the same logic on the same underlying position and inventory data.

- ## For Loan Availability

The quantity of assets available for SLAB lending must be calculated in real-time based on current position quantities. The calculation must:

- Account for all long positions and PB hypothecatable assets, across all depot boxes.

- Include all assets pledged into repos.

- Include all assets pledged into financing swaps.

- Include external exclusive availabilities.

- Include cross-border securities that may be held in other depositories.

- Exclude assets already used for SLAB lending and pay-to-holds.

- Exclude assets ‘reserved’ for client use based on availability shown and projected utilization based on client analytics.

For loan availability must be projected along the settlement date ladder and account for both the stability/duration of inventory available for lending and the settlement cycle for recalling pledged assets. Assets due to corporate actions must be excluded or highlighted separately.

Availability must be categorized by ease-of-use based on current usage, location, and entity. For example:

- Assets hypothecated

- Assets available for hypothecation

- Assets pledged but retrievable

- Assets in other depositories

- Assets in exclusive portfolios

- Assets on “hold” from other lenders

The calculation must account for variations in market regulations with the flexibility to adjust the calculation for a market or set of markets independently from others. For example:

- In Taiwan, borrowed shares cannot be re-lent so must not be included in the for-loan availability calculation.

- In Japan, the settlement cut-off time for SLAB activity is different than for outright trades, so for-loan availability must be further split by settlement cut-off times.

- Also in Japan quanto settlements have a T+1 settlement date, but always settle T+2 because of settlement windows for EUR/USD cash being different to the settlement window for Japanese stocks, so these positions must not factor into availability until T+2.

## For Pledge Availability

The quantity of shares available for pledging into financing trades (e.g. repos or financing swaps) must be calculated in real time based on current positions and inventory quantities. The calculation must include all of the features of the ‘for loan’ availability calculation, but exclude shares already pledged. Securities with upcoming corporate actions and dividends must be highlighted separately or excluded as well.

## Overborrows

Borrows no longer needed (e.g. due to the buy back of short positions) will be highlighted for return. This calculation needs to account for any pay-to-holds.

## Long and Shorty Sell Availability

## Long and short sell limits will be calculated for both client/desk positions and Aggregation units. Calculations need to factor in market specific regulations for long and short sell inventory.

The client/desk limits will be based on the client/desk’s own long position, any approved long or short locates, and any pay-to-holds. Sell orders will reduce the availability intra-day.

Aggregation unit long limits will be calculated from the net long position in the aggregation unit. Aggregation unit short limits will be calculated on borrows, holds, and/or locates based on market regulations.

All limits must appropriately factor in corporate actions or other non same-day tradable positions.

## Locate Availability

The quantity of shares available to approve locate requests will be calculated for both long and short sell locates. The calculation needs to account for market regulations defining what is short sellable and the locate decrement quantity for all locates already approved.

In markets where the locate decrement quantity may be less than the total locate quantity, the decrement quantity must be updated intraday based on trading activity. Where a client or desk executes more than the locate decrement quantity the available locate pool quantity will be reduced by a value closer to the actual quantity located. If close to market close a client has traded substantially less than the located quantity, that decrement may be reduced to make more inventory available.

In addition, the locate decrement quantity calculation needs to be customizable by a range of factors including region, market, security classification, client and any other applicable criteria and can be disabled altogether for some combinations where we do not have restrictions in how much short selling is permitted on that security, e.g. easy-to-borrow securities in the US markets.

## Calculations Maintenance Requirements

All calculations described above need to be customizable, meaning that the system needs to allow users to express rules for which assets, types of positions, and quantities are to be included and how they impact the final inventory number. These rules must be user reviewable and have a change control process with required approvals before becoming effective in the system.

They also need to allow for the export of the rules and import in a new instance of the system to allow for UAT testing and then production deployment.

# Workflows

## Locate Approvals

- Users can define auto-approval rules for locates, specifying whether they can be automatically approved or rejected based on country of issue of the security, inventory availability, security temperature (hard to borrow or general collateral), security borrow rates, number of locates approved to that client, number of locates approved for that security

- The system will receive locate approval requests from upstream systems and process the auto-approval rules specified above. If rules allow for auto-approval or auto-rejection of the locate the system will perform the instructed action. Otherwise the locate will be marked as pending user review.

- User can review the locate and request its approval. At this point the system will do a basic inventory check to ensure our inventory levels are equal or above the locate decrement quantity and if so it will mark the locate as approved.

- Once a locate is approved it will be persisted in the system and impact the inventory calculations performed above.

## Short Sell Approval

```
- The system will calculate the limit available for long sell and short sell for each client:

  - For long sell, the client limit will consist of:

    - Sum of existing long positions (based on market regulation)

    - Plus the sum of approved long sell locates

    - Minus the sum of approved long sell orders

  - For short sell the client limit will consist of:

    - Sum of approved locates

    - Plus the sum of approved short sell pay-to-holds

    - Minus the sum of approved short sell orders

- The system will also calculate the limit available for long sell and short sell for each aggregation unit:

  - For long sell, the aggregation unit limit will consist of:

    - Sum of existing long positions (based on market regulation)

  - For short sell, the aggregation unit limit will consist of:

    - Sum of existing borrow contracts

    - Minus the sum of existing loan contracts

    - Plus the sum of external lender availabilities where permitted by market regulations.

  - Once a long sell order or a short sell order is received by the system, it will map the order to the correct aggregation unit using the book ID on the order and market for the security.

  - The system will perform a first check based on the order side (sell or short sell) against the corresponding client limit. If the client does not have sufficient limit, the order will be rejected.

  - The system will then perform a second check based on the aggregation unit for that account and market and if the aggregation unit does not have sufficient limit to support that order, it will be rejected.

  - If the order has passed both checks above, it can be approved.

  - This workflow has to be performed in under 150 milliseconds.
```

# Technical Requirements

## Throughput 

The system needs to be able to process peak loads in excess of 300,000 events per second while maintaining the real-time functionality to support high-frequency market events such as open, closes, auctions, and other extreme volume scenarios.

In order to do so the messaging mechanism, internal architecture, and data store need to be carefully considered to ensure they satisfy this requirement.

Real-time in this case is defined as an event impacting all relevant calculations and being visible to downstream systems and end users within 200 milliseconds of it being received by the system.

## Resilience

The system needs to operate 24x6 with minimal downtime and 99.999% availability within those hours. To support that it needs to allow for:

- Redundancy – it needs to support partial failures without significantly impacting user experience.

- Distribution – the system needs to provide multiple access routes.

The system also needs to produce data regardless of the availability of upstream feeds, being able to use all the most recent received data to produce outputs.

## Monitoring

All exception scenarios in the system need to be published to a monitoring dashboard that allow support users to identify both data/business related exceptions and system failures.

## Deployment

While the system is intended to be global, it needs to allow for the distribution of parts of it to different locations to allow for near-edge performance. Communication between parts of the system need to be lightweight, high-throughput, and resilient.

## Message Guarantees

The system architecture needs to enforce “at least once” delivery semantics for all events, ensuring that no event gets lots under any circumstances. In order for that to be feasible it also needs to support deduplication of events for error scenarios where the same message may be delivered twice.

## UI/UX

The system needs to provide a modern, web-based UI to allow users to query and view global inventory data for all supported calculations in a performant manner. Modern design patterns for responsive UIs need to be deployed to ensure users can manage massive amounts of data without deterioration of user experience.

# Planning and Implementation 

## Technical Foundation

### Required Stack Components

- Frontend: Cross-platform mobile application supporting iOS and Android

- Backend: RESTful API architecture with secure data storage and backup systems

- Integrations: an integration framework allowing for disparate systems to connect and provide data must be implemented. The system must allow ETL-type functionality for getting data ready for internal use.

- Infrastructure: Cloud-hosted with automated scaling

- Service architecture: microservice architecture with a distributed messaging mechanism that can cross physical boundaries and run well over VPN connections. Some modules will be deployed to different geographical locations for performance, regulatory, or resilience needs.

- 

- ### System Requirements


- Performance: Dashboard load time under 3 seconds, real-time transaction updates

- Security: End-to-end encryption, secure authentication, financial regulatory compliance

- Scalability: thousands of counterparties and accounts, as well as supporting the full universe of tradeable securities in scope.

- Reliability: 99.999% uptime in the 24x6 window, daily data reconciliation, automated backups

- Testing: Comprehensive unit testing, security testing, and automated UI testing required