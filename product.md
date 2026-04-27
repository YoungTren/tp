# Product: TravelPlanner

> Русскоязычный AI travel planning продукт, который генерирует маршрут путешествия с помощью `DeepSeek`, показывает его на карте через `Yandex Maps` и дополняет фото достопримечательностей через `Google`.

## Overview

- **Problem:** Пользователю неудобно собирать поездку вручную из заметок, карт, блогов и случайных подборок. Нужен один интерфейс, где можно задать параметры поездки и получить сгенерированный AI маршрут, точки на карте и визуально понятные рекомендации по достопримечательностям.
- **Target Audience:** Русскоязычные самостоятельные путешественники, которые планируют городские и туристические поездки без турагентства.
- **Value Proposition:** TravelPlanner должен превращать несколько пользовательских входных параметров в готовый маршрут путешествия, где `DeepSeek` отвечает за логику генерации, `Yandex Maps` - за картографическое представление маршрута, а `Google` - за фотографии достопримечательностей.
- **Current Status:** Сейчас проект находится на стадии UI-прототипа. Основной сценарий уже собран, но данные, история, рекомендации и auth пока работают как демо-логика без backend и без реальной генерации маршрутов.

## Product Goal

TravelPlanner должен стать простым AI-продуктом для подготовки поездки:
- пользователь задает маршрут и параметры;
- приложение генерирует маршрут по дням через `DeepSeek`;
- пользователь возвращается к своим поездкам и пересматривает детали;
- рекомендации и история связаны с реальными созданными поездками, а не со статичными моками;
- маршрут отображается на карте через `Yandex Maps`;
- карточки мест и достопримечательностей получают фотографии через `Google`.

## Current Prototype

### What Already Exists

- Экран регистрации и входа с UI-переключением между режимами.
- Экран создания поездки с полями `from`, `to`, `dateStart`, `dateEnd`, `budget`, `travelers`.
- Dashboard с карточкой поездки, плейсхолдером карты, планом по дням и рекомендациями.
- Экран истории поездок и отдельный просмотр конкретной поездки.
- Экран полного списка рекомендаций.

### What Is Still Mocked

- Auth не подключен к реальному бэкенду.
- Созданная поездка живет только в памяти текущей сессии.
- История поездок статична и не связана с созданной пользователем поездкой.
- План по дням и рекомендации в основном захардкожены под демо-контент, а не под выбранное направление.
- Реального AI/planner engine пока нет.
- `Yandex Maps` и `Google` photo sourcing еще не подключены.

### Primary User Flow

`register/login -> setup -> dashboard -> history/recommendations`

Этот flow является главным пользовательским сценарием текущего продукта и должен оставаться основной опорой для следующих итераций.

## Target Product

Следующая целевая версия TravelPlanner - это MVP, в котором:
- пользователь создает поездку и получает AI-сгенерированный маршрут, связанный с введенными параметрами;
- поездка сохраняется и остается доступной после перезагрузки;
- история отображает реальные поездки пользователя;
- `DeepSeek` генерирует маршрут и структуру плана по дням;
- `Yandex Maps` показывает маршрут, основные точки и географический контекст поездки;
- `Google` используется для фотографий достопримечательностей и мест в карточках;
- рекомендации и план по дням адаптируются под destination и базовые ограничения поездки;
- продукт остается простым, визуально понятным и ориентированным на сценарий самостоятельного planning, а не booking.

## Features

### P0 - MVP

| Feature | Status | Effort | Impact | Acceptance Criteria |
|---------|--------|--------|--------|---------------------|
| DeepSeek itinerary generation | planned | medium | high | После отправки параметров поездки приложение получает маршрут от `DeepSeek` и показывает пользователю хотя бы 1 связный план по дням без статического fallback-контента для основного сценария. |
| Yandex Maps route visualization | planned | medium | high | На экране поездки отображается карта `Yandex Maps` как минимум с destination и точками маршрута, полученными из данных поездки. |
| Google attraction photos | planned | medium | high | Карточки рекомендаций и достопримечательностей показывают релевантные фотографии, полученные через `Google`, а не только жестко заданные URL в моках. |
| Persisted trip data | planned | medium | high | После создания поездки и перезагрузки страницы последняя созданная поездка сохраняется и снова открывается в приложении. |
| Real trip history | planned | medium | high | Каждая новая поездка появляется в истории, а открытие элемента истории показывает данные именно этой поездки. |
| Destination-aware itinerary | planned | medium | high | Заголовок маршрута, план по дням и список рекомендаций отражают выбранный `to`, а не фиксированный демо-город по умолчанию. |
| Structured trip domain model | planned | low | high | Данные поездки имеют единый тип/структуру, которая используется в setup, dashboard, history и detail без дублирующих форматов. |
| Edit and regenerate trip plan | planned | medium | medium | Пользователь может изменить параметры поездки и после подтверждения увидеть обновленный маршрут без ручного сброса состояния. |

### P1 - v1

| Feature | Status | Effort | Impact | Acceptance Criteria |
|---------|--------|--------|--------|---------------------|
| Real authentication | planned | medium | medium | Пользователь может зарегистрироваться, войти и после повторного входа получить доступ к своим сохраненным поездкам. |
| Personalized recommendations | planned | medium | medium | Рекомендации учитывают хотя бы destination, бюджет, количество путешественников и структуру AI-сгенерированного маршрута. |
| Better trip detail experience | planned | low | medium | Экран деталей поездки показывает связный маршрут, ключевые места и основные параметры без статичных чужих данных. |
| App routing instead of only screen state | planned | medium | medium | Основные состояния приложения доступны по понятным URL или имеют устойчивую навигацию назад/вперед. |

### P2 - Future

| Feature | Status | Effort | Impact | Acceptance Criteria |
|---------|--------|--------|--------|---------------------|
| Rich map interaction | planned | high | medium | Пользователь может взаимодействовать с картой: открывать точки маршрута, менять масштаб и видеть дополнительный контекст по локациям. |
| Shareable trip plans | planned | medium | medium | Пользователь может открыть или отправить ссылку на конкретную поездку в read-only режиме. |
| Collaborative planning | planned | high | low | Два и более пользователя могут просматривать и редактировать одну поездку с согласованным результатом. |

## User Stories

```gherkin
Feature: Create a new trip
  Scenario: User creates a trip and gets a plan
    Given the user is on the trip setup screen
    When the user fills origin, destination, dates, budget, and travelers and submits the form
    Then the app opens the dashboard with a trip summary and an itinerary generated by DeepSeek

Feature: Review a saved trip
  Scenario: User returns to a previously created trip
    Given the user has at least one saved trip
    When the user opens the history screen and selects a trip
    Then the app opens the detail view for that specific trip

Feature: Update trip inputs
  Scenario: User changes trip parameters
    Given the user has an existing trip plan
    When the user edits the trip parameters and confirms the update
    Then the app refreshes the route summary, itinerary, and recommendations for the updated trip

Feature: Explore the route on a map
  Scenario: User reviews generated route points
    Given the user has a generated trip plan
    When the dashboard opens the route view
    Then the app shows route points on Yandex Maps and related place photos from Google in the trip content
```

## Out Of Scope

- Полноценное бронирование билетов, отелей и туров внутри продукта.
- Платежный flow и монетизация внутри текущего MVP.
- B2B/admin-панель и enterprise-функции.
- Growth-аналитика, pricing-модели и конкурентный ресерч как обязательная часть этого документа.
- Случайные маркетинговые или showcase-экраны, которые не поддерживают основной planning flow.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS v4, shadcn/ui, Radix UI
- **AI Brain:** DeepSeek
- **Maps:** Yandex Maps
- **Place Photos:** Google
- **Animation:** `motion`
- **Validation/Form toolkit available:** Zod, React Hook Form
- **Testing:** Vitest
- **Current Deployment Target:** Vercel-friendly frontend architecture

## UX / Design

- **Language:** Russian-first interface
- **Style:** Clean visual travel UI with strong imagery, soft cards, and emphasis on route planning
- **Theme:** Dark auth/setup entry points and light dashboard/product surfaces
- **Core Screens:**
  - Auth screen - quick entry into the product
  - Trip setup - collect minimum viable input for planning
  - Dashboard - show trip summary, AI-generated day plan, map context, and recommendations
  - Trip history - list previously created trips
  - Trip detail - review one trip in more detail
- **Primary UX Principle:** сначала дать пользователю понятный и быстрый AI planning flow, потом наращивать глубину продукта

## Architecture

- **App Entry:** `src/app/page.tsx` renders `TravelPlannerApp`
- **Current Navigation Pattern:** single-page client flow with internal screen state instead of route-based navigation
- **Planned External Services:**
  - `DeepSeek` - генерация маршрута и структуры day-by-day itinerary
  - `Yandex Maps` - отображение маршрута, точек поездки и картографического контекста
  - `Google` - фотографии достопримечательностей и мест для карточек интерфейса
- **Core Product Components:**
  - `src/components/AuthScreen.tsx`
  - `src/components/TripSetup.tsx`
  - `src/components/Dashboard.tsx`
  - `src/components/TripHistory.tsx`
  - `src/components/TripHistoryDetail.tsx`
  - `src/components/RecommendationsList.tsx`
- **Current Data Model:** in-memory trip state passed through the UI
- **Important Constraint:** several landing/showcase components exist in the repository, but they are not the main source of truth for the product flow

## Working Rules For Agents

- `product.md` is the product source of truth for priorities, MVP scope, and feature intent.
- The main product flow is `auth -> trip setup -> dashboard -> history/detail/recommendations`.
- When choosing what to improve, prioritize real product behavior over decorative UI expansion.
- Prefer changes that make the current prototype more truthful: `DeepSeek` itinerary generation, `Yandex Maps` integration, `Google` photos, persistent data, real trip history, destination-aware content, and cleaner domain modeling.
- Do not introduce booking, payments, enterprise surfaces, or speculative platform features unless explicitly requested.
- Do not treat unused landing/showcase components as the primary product unless the task explicitly switches focus to them.
- Keep the interface Russian-first unless a task explicitly asks for localization work.
- When implementing AI or media features, assume the intended stack is `DeepSeek` for generation, `Yandex Maps` for maps, and `Google` for place imagery unless the user explicitly changes that direction.
- When implementing new features, preserve the existing simplicity of the planning flow and avoid unnecessary abstractions.

## Open Questions

- What persistence layer should become the first real storage step: local-first state, backend API, or hosted database?
- What exact Google source should be used for place photos: Places/Maps-related data, custom search, or another approved Google API?
- Should auth remain deferred until after persisted trips, or become part of the first MVP slice?

## Changelog

### 2026-04-24 - Product spec created

- Replaced the placeholder product file with a real TravelPlanner product specification.
- Captured the current prototype scope, target MVP direction, prioritized features, and explicit working guidance for future agents.

### 2026-04-25 - AI product direction clarified

- Updated the product definition to state that TravelPlanner is an AI itinerary generation product.
- Locked the intended service roles: `DeepSeek` for route generation, `Yandex Maps` for maps, and `Google` for place photos.
