# Gum

## Rough Description

Gum allows you to compare how often a person on Twitter uses different sets of terms over time.

----

## Usage

Enter a handle and two lists of comma-and-space-seperated terms in the form. It will spit out a graph in response that shows, for the last N days, comparisons of the number of tweets containing at least one of those terms.

----

## API

POST to /api/0/compare with the following parameters:

- `handle`: a string, excluding the `@`, with the handle of the requested Twitter user.
- `base`: a string, comma and space separated, with the base terms.
- `comparison`: a string, comma and space separated, with the comparison terms.

---- 