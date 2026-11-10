# CREDITS — что и у кого взято

Все ассеты — из офлайн-архива `~/элементы` (sites/<slug>/data/), в сборку скопированы
физически; сетевых запросов в рантайме нет.

## Шрифты

| Файлы | Семейство | Донор |
|---|---|---|
| `assets/fonts/PPNeueMontreal-{Thin,Light,Book,Regular,Medium,SemiBold,Bold}.woff2` | PP Neue Montreal (Pangram Pangram), кириллица | `noth.in` |
| `assets/fonts/GeistMono-Variable.woff2` | Geist Mono (Vercel), variable 100–900, кириллица | `rechroma.com` |

## Фотографии

| Что | Донор | Обработка |
|---|---|---|
| 48 предметных кадров каталога (`assets/img/p/*.webp`, 24 изделия × 2 ракурса) | `ceciliebahnsen.com` (Shopify CDN, предметная съёмка) | кадрирование 3:4, ч/б, контраст ×1.10, тон подложки ×0.68+10 (единая «пластина» серебра) |
| 8 кадров лукбука (`assets/img/look/l01–l08.webp`) | `ceciliebahnsen.com` (кампания AW26 Paris, бекстейдж FW26) | ч/б, контраст ×1.12 |

Растровые (дизеринг) версии не хранятся файлами — считаются на клиенте из этих же кадров
(canvas, матрица Байера 8×8, чернила #141414 / бумага #b4b2ac).

## Библиотеки (вендор)

| Файлы | Версия | Донор |
|---|---|---|
| `assets/js/vendor/gsap.min.js, ScrollTrigger, SplitText, Observer, CustomEase, Flip` | GSAP 3.15.0 | `paulkalkbrenner.net` |
| `assets/js/vendor/lenis.min.js` | Lenis 1.3.23 | `cantor8.io` |

## Механика (донорство приёмов — код переписан на свои токены)

| Приём | Донор | Что именно взято |
|---|---|---|
| Палитра (фон 8,8,7 · текст 232,232,227 · muted 147,143,138) | bymonolog.com | значения |
| Easing `cubic-bezier(.16,1,.35,1)` + `.2,1,.36,1`; длительности .25/.65/1.05 | bymonolog.com | значения твинов/переходов |
| Курсор: quickTo x/y 0.4s power3.out, появление 0.17s | bymonolog.com | параметры |
| Аккордеон grid-template-rows 0.6s cubic-bezier(.625,.05,0,1) | bymonolog.com | механика + цифры |
| Зерно grain-animation .5s steps(6) на transform | bymonolog.com | механика (текстура — своя, генеративный SVG data-URI) |
| Кнопка: текст уезжает вверх/приходит снизу 0.65s | bymonolog.com | механика |
| Переключатель звука: aria-pressed, aspect-ratio 1/1 | bymonolog.com (`./code sound-toggle`) | разметка/ARIA |
| Ревилы: start "top 80–88%", power3.out, autoAlpha | cinetica.studio, revelatio.studio | параметры |
| Пиннинг-скраб: top top → bottom bottom, scrub | cinetica.studio | параметры |
| Скрамбл-текст 1.05s ease none | revelatio.studio | параметры |
| Дизеринг изображения как состояние | revelatio.studio, doronsupply.com | идея/референс |
| HUD-рейки по краям, вертикальные подписи, таймкод | cinetica.studio, 2xa.studio | композиция |
| HUD-подвал с живыми часами, скобочные лейблы | lamalama.com | композиция |
| Строка управления каталога (счётчик, сортировка, плотность сетки) | serotoninn.com | композиция |
| Карточка товара: чипы размеров, остаток, нумерованный аккордеон | serotoninn.com | композиция |
| Звуковой порог входа («включите звук» + Enter) | immersivebags.miumiu.com | сценарий |
| Бегущая строка объявлений над шапкой | achillesheel.co.uk | сценарий |
| Нумерация плиток (01)…(04) | doronsupply.com | приём |

## Написано с нуля (доноров не было)

Синтез звука WebAudio (дрон + тики + отклики), шейдер «жидкий хром» (GLSL, реагирует на
курсор/скролл/амплитуду звука), фазовый скролл решётки (canvas), лаборатория состояний
(canvas), карта-схема проезда (canvas), корзина на localStorage, SPA-переходы, валидация
форм с маской телефона, весь контент (тексты, бренд, товары, цены, паспорта материалов).
