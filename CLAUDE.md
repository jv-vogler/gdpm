# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GDPM is a Godot Package Manager - a Node.js CLI tool for installing reusable Godot systems ("packages") into game projects. Built with TypeScript and ESBuild, using dependency injection and service-based architecture.

**Core Concept:**

- Packages are Git repositories containing a `/src` folder with reusable Godot logic
- Only the `/src` content is installed to `godot_modules/<package>` in the main project
- Versioning via Git tags (e.g., `v1.0.0`)
- Project manifest: `godot-package.json` tracks installed packages
- MVP focuses on solo development, explicit versioning, no nested dependencies

## Common Commands

### Development

- `npm run dev` - Build with watch mode for development
- `npm run build` - Bundle for production using ESBuild
- `npm run typecheck` - Run TypeScript type checking without emitting files
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

### Testing

- `npm test` - Run all tests with Vitest
- `npm run test:watch` - Run tests in watch mode

### Release

- `npm run release` - Build and publish using np

## Architecture

### Entry Point & Application Flow

- `src/index.ts` - CLI entry point with error handling
- `src/app.ts` - Main application logic
- `src/container.ts` - Dependency injection container

### Service Layer

- Services are located in `src/services/` with factory pattern
- `GitService` - Primary service for Git operations using simple-git library
- Services are registered in the container and injected where needed

### Error Handling System

- Custom error hierarchy in `src/shared/errors/`
- `AppError` - Base error class, use `instanceof` for type checking
- `GitError` - Specialized error for Git operations with command details

### Planned Services Architecture

**Core Services:**

- `FileService` - File system operations
- `GitService` - Simple Git cloning with tag checkout
- `ManifestService` - Read/write `godot-package.json`
- `PackageService` - Package installation logic and validation
- `RegistryService` - Package registry lookup (either repo or local path)

**CLI Commands:**

- `gdpm install <name>@<tag>` - Install package from registry
- `gdpm validate` - Validate current directory as package

### Path Aliasing

- `@/*` alias maps to `src/*` (configured in tsconfig.json)
- Vite tsconfig paths plugin handles resolution in tests

## Key Dependencies

- `simple-git` - Git operations
- `@inquirer/core` - CLI prompts and interactions
- `yoctocolors` - Terminal colors
- `esbuild` - Fast bundling and minification

## Build Configuration

- Target: Node 18+ (runtime requires Node 24.5.0+)
- Output: ESM format bundled to `dist/index.js`
- External packages not bundled (uses --packages=external)
- Binary name: `gdpm` (defined in package.json)

## Code Style

- Strict TypeScript configuration with type checking
- ESLint with complexity limits (max 8 complexity, 20 statements)
- Prettier formatting with import sorting
- Unix line endings enforced
- Husky pre-commit hooks with lint-staged
