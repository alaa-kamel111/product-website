# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This repository contains a simple static "Product Website" for Eng\Alaa Kamel, implemented as a single HTML file (`index.html`). It renders a basic product landing page with a header, hero section, WhatsApp contact button, and placeholder copy for future product listing and management features.

There is no build system, package manager, or backend; everything runs as plain HTML/CSS/JS in the browser.

Key files:
- `index.html`: Main and only application file, including inline styles and a small script to display the current year.
- `README.md`: High-level description of the project.

## Running and Developing

Because this is a static site, you can open `index.html` directly in a browser or serve it from any static file server.

Common ways to run locally:
- Open directly: double-click `index.html` or open it via your browser's "Open File".
- Serve via simple HTTP server (Python example):
  - `python -m http.server 8000` (from the repo root), then visit `http://localhost:8000/index.html`.

There are currently no automated tests, linting, or build commands defined in this repository.

## Architecture and Structure

### Page layout

`index.html` defines the full page structure:
- `<header>`: Contains the store name (`My Product Store`).
- `<main>`: Contains two sections:
  - `.hero` section with a welcome message and WhatsApp contact button.
  - `Products` section with placeholder text indicating where product listing and management (add/edit) will go.
- `<footer>`: Displays a copyright line with a year dynamically set via a small inline script.

All styling is done via a single `<style>` block in the `<head>` with basic typography, layout, and button styles (`.btn`, `.btn-primary`, `.btn-whatsapp`).

### Behavior and dynamic content

The only JavaScript behavior is a small inline script in the `<footer>`:
- On page load, it sets the text of the `#year` span to the current year using `new Date().getFullYear()`.

There is currently no state management, routing, or external dependencies.

### Integration points for future work

- **Product management (add/edit)**: The `Products` section in `index.html` is the intended insertion point for future product listing and CRUD UI. New HTML, CSS, and JS for managing products should be organized around this section.
- **WhatsApp contact**: The contact button uses a `wa.me` link with a hard-coded phone number. If future requirements include configuration or localization, consider extracting this number and related text into a separate configuration mechanism or templating approach.
