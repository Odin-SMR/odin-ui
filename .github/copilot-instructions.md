# Overview

Odin-ui is a web-based user interface for the Odin project. Its purpose is to give the user an overview of the project's data. Basically what measurements are made, and the results of those measurements.

## Measurements

Level1 data is calibrated and georeferenced data. Microwave spectra tuned to specific frequencies to measure absorption by specific molecules. These tunings are called Freqmodes (FM).

Level2 data is the result of analyzing level1 data. It contains the retrieved atmospheric profiles, which are the main product of the Odin project.

## Platform

The site is built using React and TypeScript. It uses two APIs: "odin-api" for level1 data and "odin-cloud-api" for level2 data. Graphs are made using the VisX library.

# Development

 - Use typescript and React best practices.
 - Types should be defined for all data structures, and used consistently throughout the codebase.
 - Use functional components and hooks where appropriate.
 - Use the VisX library for all graphing needs.
 - Use storybook for all UI components, and write stories for all components. 
 - Use storybook playwright for testing all components.
 - Provide screenshots of components when creating a pull request.