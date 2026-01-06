/**
 * Publication Resolver
 *
 * Resolves BSData publication IDs to human-readable publication names.
 */

import type { BSCatalogue, BSGameSystem, BSPublication } from "./types.js";

/**
 * Resolved publication reference
 */
export interface ResolvedPublication {
  name: string;
  shortName?: string;
  page?: string;
}

/**
 * Resolves publication IDs to publication details.
 * Publications can be defined in the game system or in catalogues.
 */
export class PublicationResolver {
  private publicationMap = new Map<string, BSPublication>();

  /**
   * Load publications from a game system file
   */
  loadFromGameSystem(gameSystem: BSGameSystem): void {
    if (!gameSystem.publications) {
      return;
    }

    for (const pub of gameSystem.publications) {
      if (pub && pub.$ && pub.$.id) {
        this.publicationMap.set(pub.$.id, pub);
      }
    }
  }

  /**
   * Load publications from a catalogue file
   */
  loadFromCatalogue(catalogue: BSCatalogue): void {
    if (!catalogue.publications) {
      return;
    }

    for (const pub of catalogue.publications) {
      if (pub && pub.$ && pub.$.id) {
        this.publicationMap.set(pub.$.id, pub);
      }
    }
  }

  /**
   * Resolve a publication ID to its details
   */
  resolve(publicationId: string, page?: string): ResolvedPublication | undefined {
    const pub = this.publicationMap.get(publicationId);
    if (!pub || !pub.$) {
      return undefined;
    }

    const result: ResolvedPublication = {
      name: pub.$.name,
    };

    if (pub.$.shortName) {
      result.shortName = pub.$.shortName;
    }

    if (page) {
      result.page = page;
    }

    return result;
  }

  /**
   * Get the number of loaded publications
   */
  get size(): number {
    return this.publicationMap.size;
  }
}
