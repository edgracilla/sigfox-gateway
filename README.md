# SIGFOX Gateway

[![Build Status](https://travis-ci.org/Reekoh/sigofx-gateway.svg)](https://travis-ci.org/Reekoh/sigofx-gateway)
![Dependencies](https://img.shields.io/david/Reekoh/sigofx-gateway.svg)
![Dependencies](https://img.shields.io/david/dev/Reekoh/sigofx-gateway.svg)
![Built With](https://img.shields.io/badge/built%20with-gulp-red.svg)

Gateway Plugin for SIGFOX HTTP Callbacks. Opens up a port where SIGFOX can forward device data to Reekoh for ingestion, processing and integration.

## Description

This plugin provides a way for SIGFOX powered devices and/or sensors to forward data to Reekoh through SIGFOX' HTTP Callback API.

## Configuration

The following parameters are needed to configure this plugin:

1. Port - The port to use in relaying messages.

These parameters are then injected to the plugin from the platform.