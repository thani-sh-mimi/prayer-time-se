//
//  RouteSpec.swift
//  Bönetider
//
//  Created by Thanish Nizam on 2025-01-30.
//

import SwiftUI

// RouteSpec describes a route
protocol RouteSpec {
  var name: String { get }
  var text: String { get }
  var icon: String { get }
  var content: any View { get }
}

// AvailableRoutes is a list of all routes used by the application.
var AvailableRoutes: [RouteSpec] = [
  HomeRouteSpec(),
  JournalRouteSpec(),
  CompassRouteSpec(),
  SettingsRouteSpec()
]

// DefaultRoute is the route that will be shown when the app is opened.
var DefaultRoute: RouteSpec {
  AvailableRoutes.first!
}

// ContentRoutes are routes with content ( does not include settings ).
var ContentRoutes: [RouteSpec] {
  AvailableRoutes.filter { $0.name != "settings" }
}
