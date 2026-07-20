/* eslint-disable */
// @ts-nocheck
// Auto-generated style route tree for TanStack Router

import { Route as rootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";

const IndexRouteWithChildren = IndexRoute;

export interface FileRoutesByFullPath {
  "/": typeof IndexRouteWithChildren;
}
export interface FileRoutesByTo {
  "/": typeof IndexRouteWithChildren;
}
export interface FileRoutesById {
  __root__: typeof rootRoute;
  "/": typeof IndexRouteWithChildren;
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath;
  fullPaths: "/";
  fileRoutesByTo: FileRoutesByTo;
  to: "/";
  id: "__root__" | "/";
  fileRoutesById: FileRoutesById;
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRouteWithChildren;
}

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/";
      path: "/";
      fullPath: "/";
      preLoaderRoute: typeof IndexRoute;
      parentRoute: typeof rootRoute;
    };
  }
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRouteWithChildren,
};

export const routeTree = rootRoute._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>();
