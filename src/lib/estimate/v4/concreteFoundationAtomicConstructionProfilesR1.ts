// Exact34 catalog identities; no new version, grade, quantity or supplier identity.
export const CONCRETE_FOUNDATION_ATOMIC_CONSTRUCTION_PROFILES_R1 = Object.freeze([
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_anchor_high_load",
    "templateId": "concrete_foundation_interior_slab_foundation_anchor_high_load_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_anchor_high_load_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "anchor",
    "contextKey": "high_load",
    "titleRu": "монтаж закладных для плитного фундамента для высокой нагрузки",
    "observedParent": {
      "definitionId": "304b53ce-dbf8-5b1a-b6d7-9bbb0c08363c",
      "version": 3,
      "definitionSha256": "14f763bb57e8a8b87a53a19dc00b8da98aaef85d35c0a57caf985312e6b5d0b1",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "a1ad6091-ea2c-52d6-91fe-4b4beb9ea9c1",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "415cc694bb69545941f3c6e539850e26b2742a0b29c7c836751bd0146c1f6e92"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_high_load",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_high_load",
    "scopeRu": "Установка именно закладных деталей до бетонирования по утверждённым чертежам, ведомости количества и массы; последующие механические и химические анкеры не включены.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_high_load_design_reference",
        "titleRu": "Проект передачи повышенных нагрузок и допустимые границы операции"
      },
      {
        "id": "foundation_load_and_rebar_clearance_reference",
        "titleRu": "Подтверждённые зоны передачи усилий, расположение арматуры и допустимые зазоры"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "installation",
        "titleRu": "Установка и фиксация закладных деталей",
        "separateRowId": "material:concrete:embedded-installation-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-installation-included-kit"
        ],
        "positions": [
          {
            "key": "fixing",
            "titleRu": "Крепёж или монтажный фиксатор закладной детали по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "marking",
            "titleRu": "Разметочная принадлежность для установки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "protective_pad",
            "titleRu": "Защитная прокладка для установки закладной детали по проекту",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "lifting",
        "titleRu": "Подъём закладных деталей",
        "separateRowId": "material:concrete:embedded-lifting-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-lifting-included-kit"
        ],
        "positions": [
          {
            "key": "sling",
            "titleRu": "Строп для подъёма закладных деталей по утверждённой схеме строповки",
            "unitId": "piece"
          },
          {
            "key": "link",
            "titleRu": "Соединительное звено грузозахватной оснастки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "edge_protection",
            "titleRu": "Защитная накладка стропа для подъёма закладных деталей",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "welding",
        "titleRu": "Оснащение монтажной сварки закладных деталей",
        "separateRowId": "material:concrete:embedded-welding-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-welding-labor-included-kit",
          "material:concrete:embedded-welding-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "cable",
            "titleRu": "Сварочный кабель совместимого поста по утверждённой процедуре сварки",
            "unitId": "m"
          },
          {
            "key": "holder",
            "titleRu": "Электрододержатель или горелка совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "ground_clamp",
            "titleRu": "Зажим обратного провода совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "abrasive_disc",
            "titleRu": "Абразивный круг для подготовки и зачистки монтажного сварного соединения",
            "unitId": "piece"
          },
          {
            "key": "protective_screen",
            "titleRu": "Защитный экран участка монтажной сварки закладных деталей",
            "unitId": "m2"
          }
        ]
      },
      {
        "key": "coating",
        "titleRu": "Восстановление покрытия закладных деталей",
        "separateRowId": "material:concrete:embedded-coating-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-coating-labor-included-kit",
          "material:concrete:embedded-coating-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "surface_abrasive",
            "titleRu": "Абразивный материал для подготовки поверхности закладной детали под восстановление покрытия",
            "unitId": "kg"
          },
          {
            "key": "application_tool",
            "titleRu": "Инструмент нанесения выбранного защитного покрытия закладной детали",
            "unitId": "piece"
          },
          {
            "key": "masking_tape",
            "titleRu": "Лента для защиты примыканий при восстановлении покрытия закладной детали",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_anchor_standard",
    "templateId": "concrete_foundation_interior_slab_foundation_anchor_standard_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_anchor_standard_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "anchor",
    "contextKey": "standard",
    "titleRu": "монтаж закладных для плитного фундамента в стандартной зоне",
    "observedParent": {
      "definitionId": "4ac05843-24c1-55f2-982b-db819fe2ee21",
      "version": 3,
      "definitionSha256": "56a307efe14d1ffcc523caac88170c9d4e40d8d87cbe94688d4e70582860aac1",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "5dbce9e2-8aa4-5056-b584-1ff13741c479",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "f059a49ac01091ef019edd31433833c293571ca07d5918334f725aafa5d82e51"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
    "scopeRu": "Установка именно закладных деталей до бетонирования по утверждённым чертежам, ведомости количества и массы; последующие механические и химические анкеры не включены.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_design_revision_reference",
        "titleRu": "Утверждённые рабочие чертежи конструкции и редакция проекта"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "installation",
        "titleRu": "Установка и фиксация закладных деталей",
        "separateRowId": "material:concrete:embedded-installation-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-installation-included-kit"
        ],
        "positions": [
          {
            "key": "fixing",
            "titleRu": "Крепёж или монтажный фиксатор закладной детали по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "marking",
            "titleRu": "Разметочная принадлежность для установки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "protective_pad",
            "titleRu": "Защитная прокладка для установки закладной детали по проекту",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "lifting",
        "titleRu": "Подъём закладных деталей",
        "separateRowId": "material:concrete:embedded-lifting-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-lifting-included-kit"
        ],
        "positions": [
          {
            "key": "sling",
            "titleRu": "Строп для подъёма закладных деталей по утверждённой схеме строповки",
            "unitId": "piece"
          },
          {
            "key": "link",
            "titleRu": "Соединительное звено грузозахватной оснастки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "edge_protection",
            "titleRu": "Защитная накладка стропа для подъёма закладных деталей",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "welding",
        "titleRu": "Оснащение монтажной сварки закладных деталей",
        "separateRowId": "material:concrete:embedded-welding-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-welding-labor-included-kit",
          "material:concrete:embedded-welding-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "cable",
            "titleRu": "Сварочный кабель совместимого поста по утверждённой процедуре сварки",
            "unitId": "m"
          },
          {
            "key": "holder",
            "titleRu": "Электрододержатель или горелка совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "ground_clamp",
            "titleRu": "Зажим обратного провода совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "abrasive_disc",
            "titleRu": "Абразивный круг для подготовки и зачистки монтажного сварного соединения",
            "unitId": "piece"
          },
          {
            "key": "protective_screen",
            "titleRu": "Защитный экран участка монтажной сварки закладных деталей",
            "unitId": "m2"
          }
        ]
      },
      {
        "key": "coating",
        "titleRu": "Восстановление покрытия закладных деталей",
        "separateRowId": "material:concrete:embedded-coating-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-coating-labor-included-kit",
          "material:concrete:embedded-coating-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "surface_abrasive",
            "titleRu": "Абразивный материал для подготовки поверхности закладной детали под восстановление покрытия",
            "unitId": "kg"
          },
          {
            "key": "application_tool",
            "titleRu": "Инструмент нанесения выбранного защитного покрытия закладной детали",
            "unitId": "piece"
          },
          {
            "key": "masking_tape",
            "titleRu": "Лента для защиты примыканий при восстановлении покрытия закладной детали",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_anchor_technical_room",
    "templateId": "concrete_foundation_interior_slab_foundation_anchor_technical_room_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_anchor_technical_room_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "anchor",
    "contextKey": "technical_room",
    "titleRu": "монтаж закладных для плитного фундамента в техническом помещении",
    "observedParent": {
      "definitionId": "956fbe34-ca60-54e9-a79a-100a85c7941e",
      "version": 3,
      "definitionSha256": "c8b4ed9535fef784e25521e66052b0cd3a188c8b63f9f9df6627febcdfc3e5fd",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "79467daa-6a3b-5485-bd22-01230034f1ff",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "b11a65a1e82c01ec880cb1f7c74c52540741f53ad22c328859864c015193b3bf"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_technical_room",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_technical_room",
    "scopeRu": "Установка именно закладных деталей до бетонирования по утверждённым чертежам, ведомости количества и массы; последующие механические и химические анкеры не включены.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_service_interfaces_reference",
        "titleRu": "Рабочие чертежи вводов, оборудования и инженерных примыканий технического помещения"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "installation",
        "titleRu": "Установка и фиксация закладных деталей",
        "separateRowId": "material:concrete:embedded-installation-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-installation-included-kit"
        ],
        "positions": [
          {
            "key": "fixing",
            "titleRu": "Крепёж или монтажный фиксатор закладной детали по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "marking",
            "titleRu": "Разметочная принадлежность для установки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "protective_pad",
            "titleRu": "Защитная прокладка для установки закладной детали по проекту",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "lifting",
        "titleRu": "Подъём закладных деталей",
        "separateRowId": "material:concrete:embedded-lifting-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-lifting-included-kit"
        ],
        "positions": [
          {
            "key": "sling",
            "titleRu": "Строп для подъёма закладных деталей по утверждённой схеме строповки",
            "unitId": "piece"
          },
          {
            "key": "link",
            "titleRu": "Соединительное звено грузозахватной оснастки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "edge_protection",
            "titleRu": "Защитная накладка стропа для подъёма закладных деталей",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "welding",
        "titleRu": "Оснащение монтажной сварки закладных деталей",
        "separateRowId": "material:concrete:embedded-welding-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-welding-labor-included-kit",
          "material:concrete:embedded-welding-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "cable",
            "titleRu": "Сварочный кабель совместимого поста по утверждённой процедуре сварки",
            "unitId": "m"
          },
          {
            "key": "holder",
            "titleRu": "Электрододержатель или горелка совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "ground_clamp",
            "titleRu": "Зажим обратного провода совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "abrasive_disc",
            "titleRu": "Абразивный круг для подготовки и зачистки монтажного сварного соединения",
            "unitId": "piece"
          },
          {
            "key": "protective_screen",
            "titleRu": "Защитный экран участка монтажной сварки закладных деталей",
            "unitId": "m2"
          }
        ]
      },
      {
        "key": "coating",
        "titleRu": "Восстановление покрытия закладных деталей",
        "separateRowId": "material:concrete:embedded-coating-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-coating-labor-included-kit",
          "material:concrete:embedded-coating-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "surface_abrasive",
            "titleRu": "Абразивный материал для подготовки поверхности закладной детали под восстановление покрытия",
            "unitId": "kg"
          },
          {
            "key": "application_tool",
            "titleRu": "Инструмент нанесения выбранного защитного покрытия закладной детали",
            "unitId": "piece"
          },
          {
            "key": "masking_tape",
            "titleRu": "Лента для защиты примыканий при восстановлении покрытия закладной детали",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_anchor_wet_zone",
    "templateId": "concrete_foundation_interior_slab_foundation_anchor_wet_zone_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_anchor_wet_zone_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "anchor",
    "contextKey": "wet_zone",
    "titleRu": "монтаж закладных для плитного фундамента во влажной зоне",
    "observedParent": {
      "definitionId": "54c66003-1c41-5881-9596-d6f871ef89d9",
      "version": 3,
      "definitionSha256": "f862bf34f00e48228563bebdbc3ed8765881fb16fa225fab4abf6148c8bea8e3",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "114c41ea-c1b1-50c7-aa03-25b065a1867e",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "a592bc459fd0f95d5081dfb80a31fb64663273b06ccb6fb05209b5dcbc1c7892"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_wet_zone",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_wet_zone",
    "scopeRu": "Установка именно закладных деталей до бетонирования по утверждённым чертежам, ведомости количества и массы; последующие механические и химические анкеры не включены.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_moisture_compatibility_reference",
        "titleRu": "Фактическое увлажнение основания и подтверждённая совместимость выбранных материалов и метода"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "installation",
        "titleRu": "Установка и фиксация закладных деталей",
        "separateRowId": "material:concrete:embedded-installation-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-installation-included-kit"
        ],
        "positions": [
          {
            "key": "fixing",
            "titleRu": "Крепёж или монтажный фиксатор закладной детали по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "marking",
            "titleRu": "Разметочная принадлежность для установки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "protective_pad",
            "titleRu": "Защитная прокладка для установки закладной детали по проекту",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "lifting",
        "titleRu": "Подъём закладных деталей",
        "separateRowId": "material:concrete:embedded-lifting-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-lifting-included-kit"
        ],
        "positions": [
          {
            "key": "sling",
            "titleRu": "Строп для подъёма закладных деталей по утверждённой схеме строповки",
            "unitId": "piece"
          },
          {
            "key": "link",
            "titleRu": "Соединительное звено грузозахватной оснастки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "edge_protection",
            "titleRu": "Защитная накладка стропа для подъёма закладных деталей",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "welding",
        "titleRu": "Оснащение монтажной сварки закладных деталей",
        "separateRowId": "material:concrete:embedded-welding-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-welding-labor-included-kit",
          "material:concrete:embedded-welding-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "cable",
            "titleRu": "Сварочный кабель совместимого поста по утверждённой процедуре сварки",
            "unitId": "m"
          },
          {
            "key": "holder",
            "titleRu": "Электрододержатель или горелка совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "ground_clamp",
            "titleRu": "Зажим обратного провода совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "abrasive_disc",
            "titleRu": "Абразивный круг для подготовки и зачистки монтажного сварного соединения",
            "unitId": "piece"
          },
          {
            "key": "protective_screen",
            "titleRu": "Защитный экран участка монтажной сварки закладных деталей",
            "unitId": "m2"
          }
        ]
      },
      {
        "key": "coating",
        "titleRu": "Восстановление покрытия закладных деталей",
        "separateRowId": "material:concrete:embedded-coating-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-coating-labor-included-kit",
          "material:concrete:embedded-coating-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "surface_abrasive",
            "titleRu": "Абразивный материал для подготовки поверхности закладной детали под восстановление покрытия",
            "unitId": "kg"
          },
          {
            "key": "application_tool",
            "titleRu": "Инструмент нанесения выбранного защитного покрытия закладной детали",
            "unitId": "piece"
          },
          {
            "key": "masking_tape",
            "titleRu": "Лента для защиты примыканий при восстановлении покрытия закладной детали",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_level_high_load",
    "templateId": "concrete_foundation_interior_slab_foundation_level_high_load_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_level_high_load_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "level",
    "contextKey": "high_load",
    "titleRu": "выравнивание плитного фундамента для высокой нагрузки",
    "observedParent": {
      "definitionId": "6e1668aa-8a39-592e-bc74-dc95029fb85a",
      "version": 3,
      "definitionSha256": "b771da4ee59a352af6ced2a0af0ad6e6ff3c2ebeeb778968d60187e175d74cd1",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "51f605dc-8fba-519e-b32c-096e60a367b9",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "b74704f98c1ebb167c526f511886c984a34254db84142f1bccc73f4b575b6184"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_high_load",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_high_load",
    "scopeRu": "Выравнивание только поверхности свежеуложенного бетона по проектным отметкам, уклонам и требованиям к ровности; не полное устройство плитного фундамента.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_high_load_design_reference",
        "titleRu": "Проект передачи повышенных нагрузок и допустимые границы операции"
      },
      {
        "id": "foundation_load_and_rebar_clearance_reference",
        "titleRu": "Подтверждённые зоны передачи усилий, расположение арматуры и допустимые зазоры"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "level_guides",
        "titleRu": "Крепление и опоры направляющих",
        "separateRowId": "material:concrete:leveling-guide-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-guide-included-kit"
        ],
        "positions": [
          {
            "key": "support",
            "titleRu": "Опора направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "fastener",
            "titleRu": "Крепёж направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "level_equipment",
        "titleRu": "Оснащение оборудования выравнивания",
        "separateRowId": "material:concrete:leveling-equipment-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "working_part",
            "titleRu": "Сменный рабочий орган оборудования для выравнивания бетона",
            "unitId": "piece"
          },
          {
            "key": "cable",
            "titleRu": "Соединительный кабель выбранного оборудования для выравнивания бетона",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_level_repair",
    "templateId": "concrete_foundation_interior_slab_foundation_level_repair_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_level_repair_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "level",
    "contextKey": "repair",
    "titleRu": "выравнивание плитного фундамента с локальным ремонтом основания",
    "observedParent": {
      "definitionId": "2f4a3c12-beee-5e6f-a697-7b3f4418928e",
      "version": 3,
      "definitionSha256": "dc65f163a2ec59fc50d3cbbfcb5012fabe55d2b5bf59ecd46025dc6acbe28e56",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "e0641c44-30bd-5c94-bcfd-bcbe2d01dea3",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "1d4b9eaeca6533cd650b85a32e91cc97438d922dfbea7ba9a508d4ec8658e9c3"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair",
    "scopeRu": "Выравнивание только поверхности свежеуложенного бетона по проектным отметкам, уклонам и требованиям к ровности; не полное устройство плитного фундамента.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_existing_base_condition_reference",
        "titleRu": "Обследование существующего основания и проектная граница локального ремонта"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "level_guides",
        "titleRu": "Крепление и опоры направляющих",
        "separateRowId": "material:concrete:leveling-guide-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-guide-included-kit"
        ],
        "positions": [
          {
            "key": "support",
            "titleRu": "Опора направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "fastener",
            "titleRu": "Крепёж направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "level_equipment",
        "titleRu": "Оснащение оборудования выравнивания",
        "separateRowId": "material:concrete:leveling-equipment-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "working_part",
            "titleRu": "Сменный рабочий орган оборудования для выравнивания бетона",
            "unitId": "piece"
          },
          {
            "key": "cable",
            "titleRu": "Соединительный кабель выбранного оборудования для выравнивания бетона",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_level_standard",
    "templateId": "concrete_foundation_interior_slab_foundation_level_standard_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_level_standard_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "level",
    "contextKey": "standard",
    "titleRu": "выравнивание плитного фундамента в стандартной зоне",
    "observedParent": {
      "definitionId": "e2096b3e-fba0-562f-abb3-673561e6bf6d",
      "version": 3,
      "definitionSha256": "9efd0e949dffc7901181f1cf5e856738f3e5c68a7f42c11efa176f53389da73c",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "15238605-3783-5d40-b012-fe90aa9a908c",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "29737d7b10c7a409d8a4ea822e9b2fdc81b1dc26771b074ccdbfb60ea77bd0b0"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
    "scopeRu": "Выравнивание только поверхности свежеуложенного бетона по проектным отметкам, уклонам и требованиям к ровности; не полное устройство плитного фундамента.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_design_revision_reference",
        "titleRu": "Утверждённые рабочие чертежи конструкции и редакция проекта"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "level_guides",
        "titleRu": "Крепление и опоры направляющих",
        "separateRowId": "material:concrete:leveling-guide-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-guide-included-kit"
        ],
        "positions": [
          {
            "key": "support",
            "titleRu": "Опора направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "fastener",
            "titleRu": "Крепёж направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "level_equipment",
        "titleRu": "Оснащение оборудования выравнивания",
        "separateRowId": "material:concrete:leveling-equipment-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "working_part",
            "titleRu": "Сменный рабочий орган оборудования для выравнивания бетона",
            "unitId": "piece"
          },
          {
            "key": "cable",
            "titleRu": "Соединительный кабель выбранного оборудования для выравнивания бетона",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_level_technical_room",
    "templateId": "concrete_foundation_interior_slab_foundation_level_technical_room_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_level_technical_room_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "level",
    "contextKey": "technical_room",
    "titleRu": "выравнивание плитного фундамента в техническом помещении",
    "observedParent": {
      "definitionId": "04ee6162-4d19-5e54-8976-9d0aceef71b9",
      "version": 3,
      "definitionSha256": "0c3184783ea1ca10a7bff724f6e8349bfa794956ac52b58c814fe536053d5a58",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "964593dd-ed6f-5b91-863b-eca1b8c03af6",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "65cae5ffb309eb79d3f7f88734be51ce83c9079ccd52193a8477c0a3f1af937d"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_technical_room",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_technical_room",
    "scopeRu": "Выравнивание только поверхности свежеуложенного бетона по проектным отметкам, уклонам и требованиям к ровности; не полное устройство плитного фундамента.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_service_interfaces_reference",
        "titleRu": "Рабочие чертежи вводов, оборудования и инженерных примыканий технического помещения"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "level_guides",
        "titleRu": "Крепление и опоры направляющих",
        "separateRowId": "material:concrete:leveling-guide-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-guide-included-kit"
        ],
        "positions": [
          {
            "key": "support",
            "titleRu": "Опора направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "fastener",
            "titleRu": "Крепёж направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "level_equipment",
        "titleRu": "Оснащение оборудования выравнивания",
        "separateRowId": "material:concrete:leveling-equipment-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "working_part",
            "titleRu": "Сменный рабочий орган оборудования для выравнивания бетона",
            "unitId": "piece"
          },
          {
            "key": "cable",
            "titleRu": "Соединительный кабель выбранного оборудования для выравнивания бетона",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_level_wet_zone",
    "templateId": "concrete_foundation_interior_slab_foundation_level_wet_zone_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_level_wet_zone_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "level",
    "contextKey": "wet_zone",
    "titleRu": "выравнивание плитного фундамента во влажной зоне",
    "observedParent": {
      "definitionId": "083da2a7-976d-5f73-9453-aabedc4479a5",
      "version": 3,
      "definitionSha256": "89ead931a2cab5f96ecc2589964c16a45c9196dc6085e10e55f4218b982a1dda",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "e9303408-8374-5a39-b458-a3dc703327f6",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "17eb333728b8a94043c83cc3e823103f1c5d575e19e2c7163fb2d8da83e5f973"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_wet_zone",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_wet_zone",
    "scopeRu": "Выравнивание только поверхности свежеуложенного бетона по проектным отметкам, уклонам и требованиям к ровности; не полное устройство плитного фундамента.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_moisture_compatibility_reference",
        "titleRu": "Фактическое увлажнение основания и подтверждённая совместимость выбранных материалов и метода"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "level_guides",
        "titleRu": "Крепление и опоры направляющих",
        "separateRowId": "material:concrete:leveling-guide-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-guide-included-kit"
        ],
        "positions": [
          {
            "key": "support",
            "titleRu": "Опора направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "fastener",
            "titleRu": "Крепёж направляющей выравнивания бетона по рабочим чертежам",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "level_equipment",
        "titleRu": "Оснащение оборудования выравнивания",
        "separateRowId": "material:concrete:leveling-equipment-separate-kit",
        "includedRowIds": [
          "material:concrete:leveling-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "working_part",
            "titleRu": "Сменный рабочий орган оборудования для выравнивания бетона",
            "unitId": "piece"
          },
          {
            "key": "cable",
            "titleRu": "Соединительный кабель выбранного оборудования для выравнивания бетона",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_repair_high_load",
    "templateId": "concrete_foundation_interior_slab_foundation_repair_high_load_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_repair_high_load_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "repair",
    "contextKey": "high_load",
    "titleRu": "ремонт плитного фундамента для высокой нагрузки",
    "observedParent": {
      "definitionId": "683a3898-4721-5735-b094-46e20b4a57e3",
      "version": 3,
      "definitionSha256": "405bc3e7b45de1d9105c060c7fffc4f1be56981f36898e0a05ce14ddbacade5d",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "0308c1a0-05b5-5992-834b-8de9eba4c6ea",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "5f5e961d3cc96c11ed0c7211476c77c62a4725a46b9c3592763ddd44e6db8681"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_high_load",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_high_load",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_high_load_design_reference",
        "titleRu": "Проект передачи повышенных нагрузок и допустимые границы операции"
      },
      {
        "id": "foundation_load_and_rebar_clearance_reference",
        "titleRu": "Подтверждённые зоны передачи усилий, расположение арматуры и допустимые зазоры"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_repair_repair",
    "templateId": "concrete_foundation_interior_slab_foundation_repair_repair_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_repair_repair_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "repair",
    "contextKey": "repair",
    "titleRu": "ремонт плитного фундамента с локальным ремонтом основания",
    "observedParent": {
      "definitionId": "14b82cfc-7812-5f6e-b548-c0e3edf65b99",
      "version": 3,
      "definitionSha256": "d9eb9fcb45727a389c49baf9c5d912b2c4d2e66ffbea24901e36449b43e4a0fc",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "4b1ab05b-9526-55c0-bcd5-98851c5133cd",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "ae87debe45f69adc8f6fe0287bdf109193634750b22c932936f7e4af4512bdef"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_existing_base_condition_reference",
        "titleRu": "Обследование существующего основания и проектная граница локального ремонта"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_repair_standard",
    "templateId": "concrete_foundation_interior_slab_foundation_repair_standard_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_repair_standard_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "repair",
    "contextKey": "standard",
    "titleRu": "ремонт плитного фундамента в стандартной зоне",
    "observedParent": {
      "definitionId": "39895b7b-4deb-52d8-b696-f59d2792a5b2",
      "version": 3,
      "definitionSha256": "1db5431d649d397df1646dec906be045a6e79baca5652dffbe21771624c926f7",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "ddd5c4ed-5730-533a-b492-f44d19647b0c",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "02c49951182864d0417ba331fa31abb8823e946470a54f710c2af54f159086d3"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_design_revision_reference",
        "titleRu": "Утверждённые рабочие чертежи конструкции и редакция проекта"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_repair_technical_room",
    "templateId": "concrete_foundation_interior_slab_foundation_repair_technical_room_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_repair_technical_room_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "repair",
    "contextKey": "technical_room",
    "titleRu": "ремонт плитного фундамента в техническом помещении",
    "observedParent": {
      "definitionId": "71cd6a6b-5fd8-5c82-bf63-601281152760",
      "version": 3,
      "definitionSha256": "c6f2f319782e184e116a9520ed11006b2186e1a2f4188a399addb715b63a931d",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "6caa6209-80b9-5767-a66d-176ac54e235c",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "d5df44943631b39290ab5d2a540600e2f9d7584080626a72670656098b0ccd13"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_technical_room",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_technical_room",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_service_interfaces_reference",
        "titleRu": "Рабочие чертежи вводов, оборудования и инженерных примыканий технического помещения"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_repair_wet_zone",
    "templateId": "concrete_foundation_interior_slab_foundation_repair_wet_zone_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_slab_foundation_repair_wet_zone_professional_expanded_v1",
    "family": "slab_foundation",
    "operation": "repair",
    "contextKey": "wet_zone",
    "titleRu": "ремонт плитного фундамента во влажной зоне",
    "observedParent": {
      "definitionId": "12f41ac1-c290-543a-9a66-cac4c388dd61",
      "version": 3,
      "definitionSha256": "aab6903f286ee9e958a4ca6991fc84bad2aacf623c102b9a87097e1c5022220e",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "dbca3f38-a1e0-5993-a3db-2a9b0704d824",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "2f47037e8c040da7365ffa70e1a8332f385fa3719cd7a94672f762472c18c147"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_wet_zone",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_wet_zone",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи плитного фундамента: план, площадь, толщины, верхняя/нижняя/торцевые поверхности, отверстия, отметки и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_moisture_compatibility_reference",
        "titleRu": "Фактическое увлажнение основания и подтверждённая совместимость выбранных материалов и метода"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_anchor_high_load",
    "templateId": "concrete_foundation_interior_strip_foundation_anchor_high_load_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_anchor_high_load_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "anchor",
    "contextKey": "high_load",
    "titleRu": "монтаж закладных для ленточного фундамента для высокой нагрузки",
    "observedParent": {
      "definitionId": "726a885e-bf3f-506f-9796-49af62a7c7ea",
      "version": 3,
      "definitionSha256": "ed1ccd5e07d0668813e12671cdb3ba56e573e032711a4b276aad17993eb2779e",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "585bcee8-8d9e-5eba-b0e0-a1c08e5d50c7",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "06f75f105b695ec86b5a01c6ad02e9290195704a19bd5e51a00a58fa94f5f235"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_high_load",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_high_load",
    "scopeRu": "Установка именно закладных деталей до бетонирования по утверждённым чертежам, ведомости количества и массы; последующие механические и химические анкеры не включены.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_high_load_design_reference",
        "titleRu": "Проект передачи повышенных нагрузок и допустимые границы операции"
      },
      {
        "id": "foundation_load_and_rebar_clearance_reference",
        "titleRu": "Подтверждённые зоны передачи усилий, расположение арматуры и допустимые зазоры"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "installation",
        "titleRu": "Установка и фиксация закладных деталей",
        "separateRowId": "material:concrete:embedded-installation-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-installation-included-kit"
        ],
        "positions": [
          {
            "key": "fixing",
            "titleRu": "Крепёж или монтажный фиксатор закладной детали по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "marking",
            "titleRu": "Разметочная принадлежность для установки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "protective_pad",
            "titleRu": "Защитная прокладка для установки закладной детали по проекту",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "lifting",
        "titleRu": "Подъём закладных деталей",
        "separateRowId": "material:concrete:embedded-lifting-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-lifting-included-kit"
        ],
        "positions": [
          {
            "key": "sling",
            "titleRu": "Строп для подъёма закладных деталей по утверждённой схеме строповки",
            "unitId": "piece"
          },
          {
            "key": "link",
            "titleRu": "Соединительное звено грузозахватной оснастки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "edge_protection",
            "titleRu": "Защитная накладка стропа для подъёма закладных деталей",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "welding",
        "titleRu": "Оснащение монтажной сварки закладных деталей",
        "separateRowId": "material:concrete:embedded-welding-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-welding-labor-included-kit",
          "material:concrete:embedded-welding-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "cable",
            "titleRu": "Сварочный кабель совместимого поста по утверждённой процедуре сварки",
            "unitId": "m"
          },
          {
            "key": "holder",
            "titleRu": "Электрододержатель или горелка совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "ground_clamp",
            "titleRu": "Зажим обратного провода совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "abrasive_disc",
            "titleRu": "Абразивный круг для подготовки и зачистки монтажного сварного соединения",
            "unitId": "piece"
          },
          {
            "key": "protective_screen",
            "titleRu": "Защитный экран участка монтажной сварки закладных деталей",
            "unitId": "m2"
          }
        ]
      },
      {
        "key": "coating",
        "titleRu": "Восстановление покрытия закладных деталей",
        "separateRowId": "material:concrete:embedded-coating-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-coating-labor-included-kit",
          "material:concrete:embedded-coating-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "surface_abrasive",
            "titleRu": "Абразивный материал для подготовки поверхности закладной детали под восстановление покрытия",
            "unitId": "kg"
          },
          {
            "key": "application_tool",
            "titleRu": "Инструмент нанесения выбранного защитного покрытия закладной детали",
            "unitId": "piece"
          },
          {
            "key": "masking_tape",
            "titleRu": "Лента для защиты примыканий при восстановлении покрытия закладной детали",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_anchor_standard",
    "templateId": "concrete_foundation_interior_strip_foundation_anchor_standard_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_anchor_standard_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "anchor",
    "contextKey": "standard",
    "titleRu": "монтаж закладных для ленточного фундамента в стандартной зоне",
    "observedParent": {
      "definitionId": "0e707b23-ca2b-5d92-bb18-292ccb96eba0",
      "version": 3,
      "definitionSha256": "616fa41773a6216fd1a46d267c5005a3ed628d669e399b147ce96f42499f43c4",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "7b8d1b7e-ac0a-5ca4-8d2b-56bab2f6011c",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "f8618cb75c5c2b18f07892438377b0faa1b065aff00282b38010932b87e44797"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard",
    "scopeRu": "Установка именно закладных деталей до бетонирования по утверждённым чертежам, ведомости количества и массы; последующие механические и химические анкеры не включены.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_design_revision_reference",
        "titleRu": "Утверждённые рабочие чертежи конструкции и редакция проекта"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "installation",
        "titleRu": "Установка и фиксация закладных деталей",
        "separateRowId": "material:concrete:embedded-installation-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-installation-included-kit"
        ],
        "positions": [
          {
            "key": "fixing",
            "titleRu": "Крепёж или монтажный фиксатор закладной детали по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "marking",
            "titleRu": "Разметочная принадлежность для установки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "protective_pad",
            "titleRu": "Защитная прокладка для установки закладной детали по проекту",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "lifting",
        "titleRu": "Подъём закладных деталей",
        "separateRowId": "material:concrete:embedded-lifting-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-lifting-included-kit"
        ],
        "positions": [
          {
            "key": "sling",
            "titleRu": "Строп для подъёма закладных деталей по утверждённой схеме строповки",
            "unitId": "piece"
          },
          {
            "key": "link",
            "titleRu": "Соединительное звено грузозахватной оснастки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "edge_protection",
            "titleRu": "Защитная накладка стропа для подъёма закладных деталей",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "welding",
        "titleRu": "Оснащение монтажной сварки закладных деталей",
        "separateRowId": "material:concrete:embedded-welding-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-welding-labor-included-kit",
          "material:concrete:embedded-welding-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "cable",
            "titleRu": "Сварочный кабель совместимого поста по утверждённой процедуре сварки",
            "unitId": "m"
          },
          {
            "key": "holder",
            "titleRu": "Электрододержатель или горелка совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "ground_clamp",
            "titleRu": "Зажим обратного провода совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "abrasive_disc",
            "titleRu": "Абразивный круг для подготовки и зачистки монтажного сварного соединения",
            "unitId": "piece"
          },
          {
            "key": "protective_screen",
            "titleRu": "Защитный экран участка монтажной сварки закладных деталей",
            "unitId": "m2"
          }
        ]
      },
      {
        "key": "coating",
        "titleRu": "Восстановление покрытия закладных деталей",
        "separateRowId": "material:concrete:embedded-coating-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-coating-labor-included-kit",
          "material:concrete:embedded-coating-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "surface_abrasive",
            "titleRu": "Абразивный материал для подготовки поверхности закладной детали под восстановление покрытия",
            "unitId": "kg"
          },
          {
            "key": "application_tool",
            "titleRu": "Инструмент нанесения выбранного защитного покрытия закладной детали",
            "unitId": "piece"
          },
          {
            "key": "masking_tape",
            "titleRu": "Лента для защиты примыканий при восстановлении покрытия закладной детали",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_anchor_technical_room",
    "templateId": "concrete_foundation_interior_strip_foundation_anchor_technical_room_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_anchor_technical_room_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "anchor",
    "contextKey": "technical_room",
    "titleRu": "монтаж закладных для ленточного фундамента в техническом помещении",
    "observedParent": {
      "definitionId": "cd8c3340-6cbf-5cfe-9ecc-727bbdd465fc",
      "version": 3,
      "definitionSha256": "b5117b67163c2ffaa884172b18ac6961adb9aabe5aed69280a4fab777559ceda",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "c955bbe2-d2e3-5902-a140-1f276fd7f1de",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "4d6203754cfedf26e31048af1f5b20bacd8e757d9f81b6a8bc725a916594df65"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_technical_room",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_technical_room",
    "scopeRu": "Установка именно закладных деталей до бетонирования по утверждённым чертежам, ведомости количества и массы; последующие механические и химические анкеры не включены.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_service_interfaces_reference",
        "titleRu": "Рабочие чертежи вводов, оборудования и инженерных примыканий технического помещения"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "installation",
        "titleRu": "Установка и фиксация закладных деталей",
        "separateRowId": "material:concrete:embedded-installation-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-installation-included-kit"
        ],
        "positions": [
          {
            "key": "fixing",
            "titleRu": "Крепёж или монтажный фиксатор закладной детали по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "marking",
            "titleRu": "Разметочная принадлежность для установки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "protective_pad",
            "titleRu": "Защитная прокладка для установки закладной детали по проекту",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "lifting",
        "titleRu": "Подъём закладных деталей",
        "separateRowId": "material:concrete:embedded-lifting-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-lifting-included-kit"
        ],
        "positions": [
          {
            "key": "sling",
            "titleRu": "Строп для подъёма закладных деталей по утверждённой схеме строповки",
            "unitId": "piece"
          },
          {
            "key": "link",
            "titleRu": "Соединительное звено грузозахватной оснастки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "edge_protection",
            "titleRu": "Защитная накладка стропа для подъёма закладных деталей",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "welding",
        "titleRu": "Оснащение монтажной сварки закладных деталей",
        "separateRowId": "material:concrete:embedded-welding-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-welding-labor-included-kit",
          "material:concrete:embedded-welding-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "cable",
            "titleRu": "Сварочный кабель совместимого поста по утверждённой процедуре сварки",
            "unitId": "m"
          },
          {
            "key": "holder",
            "titleRu": "Электрододержатель или горелка совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "ground_clamp",
            "titleRu": "Зажим обратного провода совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "abrasive_disc",
            "titleRu": "Абразивный круг для подготовки и зачистки монтажного сварного соединения",
            "unitId": "piece"
          },
          {
            "key": "protective_screen",
            "titleRu": "Защитный экран участка монтажной сварки закладных деталей",
            "unitId": "m2"
          }
        ]
      },
      {
        "key": "coating",
        "titleRu": "Восстановление покрытия закладных деталей",
        "separateRowId": "material:concrete:embedded-coating-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-coating-labor-included-kit",
          "material:concrete:embedded-coating-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "surface_abrasive",
            "titleRu": "Абразивный материал для подготовки поверхности закладной детали под восстановление покрытия",
            "unitId": "kg"
          },
          {
            "key": "application_tool",
            "titleRu": "Инструмент нанесения выбранного защитного покрытия закладной детали",
            "unitId": "piece"
          },
          {
            "key": "masking_tape",
            "titleRu": "Лента для защиты примыканий при восстановлении покрытия закладной детали",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_anchor_wet_zone",
    "templateId": "concrete_foundation_interior_strip_foundation_anchor_wet_zone_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_anchor_wet_zone_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "anchor",
    "contextKey": "wet_zone",
    "titleRu": "монтаж закладных для ленточного фундамента во влажной зоне",
    "observedParent": {
      "definitionId": "2d78191c-fa78-51ee-a3f5-8b84b1a56480",
      "version": 3,
      "definitionSha256": "17e3a06f631a0cdb822d9bd7c3ab0d06136e6d3f4427db42b8ee2b2518bca856",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "c61d9115-6c6d-5612-932c-0a08d64a0109",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "94b70c5acaae63577bfe494a21a12f97cc79c9666ba4933b8cc1fb0b49a9af0e"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_wet_zone",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_wet_zone",
    "scopeRu": "Установка именно закладных деталей до бетонирования по утверждённым чертежам, ведомости количества и массы; последующие механические и химические анкеры не включены.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_moisture_compatibility_reference",
        "titleRu": "Фактическое увлажнение основания и подтверждённая совместимость выбранных материалов и метода"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "installation",
        "titleRu": "Установка и фиксация закладных деталей",
        "separateRowId": "material:concrete:embedded-installation-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-installation-included-kit"
        ],
        "positions": [
          {
            "key": "fixing",
            "titleRu": "Крепёж или монтажный фиксатор закладной детали по рабочим чертежам",
            "unitId": "piece"
          },
          {
            "key": "marking",
            "titleRu": "Разметочная принадлежность для установки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "protective_pad",
            "titleRu": "Защитная прокладка для установки закладной детали по проекту",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "lifting",
        "titleRu": "Подъём закладных деталей",
        "separateRowId": "material:concrete:embedded-lifting-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-lifting-included-kit"
        ],
        "positions": [
          {
            "key": "sling",
            "titleRu": "Строп для подъёма закладных деталей по утверждённой схеме строповки",
            "unitId": "piece"
          },
          {
            "key": "link",
            "titleRu": "Соединительное звено грузозахватной оснастки закладных деталей",
            "unitId": "piece"
          },
          {
            "key": "edge_protection",
            "titleRu": "Защитная накладка стропа для подъёма закладных деталей",
            "unitId": "piece"
          }
        ]
      },
      {
        "key": "welding",
        "titleRu": "Оснащение монтажной сварки закладных деталей",
        "separateRowId": "material:concrete:embedded-welding-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-welding-labor-included-kit",
          "material:concrete:embedded-welding-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "cable",
            "titleRu": "Сварочный кабель совместимого поста по утверждённой процедуре сварки",
            "unitId": "m"
          },
          {
            "key": "holder",
            "titleRu": "Электрододержатель или горелка совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "ground_clamp",
            "titleRu": "Зажим обратного провода совместимого сварочного поста",
            "unitId": "piece"
          },
          {
            "key": "abrasive_disc",
            "titleRu": "Абразивный круг для подготовки и зачистки монтажного сварного соединения",
            "unitId": "piece"
          },
          {
            "key": "protective_screen",
            "titleRu": "Защитный экран участка монтажной сварки закладных деталей",
            "unitId": "m2"
          }
        ]
      },
      {
        "key": "coating",
        "titleRu": "Восстановление покрытия закладных деталей",
        "separateRowId": "material:concrete:embedded-coating-separate-kit",
        "includedRowIds": [
          "material:concrete:embedded-coating-labor-included-kit",
          "material:concrete:embedded-coating-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "surface_abrasive",
            "titleRu": "Абразивный материал для подготовки поверхности закладной детали под восстановление покрытия",
            "unitId": "kg"
          },
          {
            "key": "application_tool",
            "titleRu": "Инструмент нанесения выбранного защитного покрытия закладной детали",
            "unitId": "piece"
          },
          {
            "key": "masking_tape",
            "titleRu": "Лента для защиты примыканий при восстановлении покрытия закладной детали",
            "unitId": "m"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_repair_high_load",
    "templateId": "concrete_foundation_interior_strip_foundation_repair_high_load_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_repair_high_load_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "repair",
    "contextKey": "high_load",
    "titleRu": "ремонт ленточного фундамента для высокой нагрузки",
    "observedParent": {
      "definitionId": "c9411b04-cd0e-5733-b288-b87886c5ce54",
      "version": 3,
      "definitionSha256": "29ba20d9fd829776795b5ff0141a4bdd2e4dff6fc91cd8a983d9fc4f5e8aed81",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "ba7b4098-7c87-5073-910e-af33e6cf8943",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "cbf319a1b50c597fb160ccd7b7e6a40239c298feeb6505fe60876c996ddf097d"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_high_load",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_high_load",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_high_load_design_reference",
        "titleRu": "Проект передачи повышенных нагрузок и допустимые границы операции"
      },
      {
        "id": "foundation_load_and_rebar_clearance_reference",
        "titleRu": "Подтверждённые зоны передачи усилий, расположение арматуры и допустимые зазоры"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_repair_repair",
    "templateId": "concrete_foundation_interior_strip_foundation_repair_repair_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_repair_repair_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "repair",
    "contextKey": "repair",
    "titleRu": "ремонт ленточного фундамента с локальным ремонтом основания",
    "observedParent": {
      "definitionId": "daa3fac5-b8c5-5342-a72b-80797fcec2d8",
      "version": 3,
      "definitionSha256": "eb402fa9ed02dab12a91896871592ede009b805628e628e85c88ba82c6ae2c8f",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "8a752391-f7d3-5423-a3af-c2b4e1e16129",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "8f65f71c7ae8a4a9870619b54669aba7bed71557f93a9eec0320b5761f92f13f"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_repair",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_repair",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_existing_base_condition_reference",
        "titleRu": "Обследование существующего основания и проектная граница локального ремонта"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_repair_standard",
    "templateId": "concrete_foundation_interior_strip_foundation_repair_standard_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_repair_standard_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "repair",
    "contextKey": "standard",
    "titleRu": "ремонт ленточного фундамента в стандартной зоне",
    "observedParent": {
      "definitionId": "df9f1428-03ae-5ada-ba4b-9234aab19784",
      "version": 3,
      "definitionSha256": "f92af82f63c2f50a43ed9c34304e80dd22a64ef4be7e7deb3dd3f2e95ebf3818",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "6c5993dc-310d-5f5e-bb95-2a32ba2d71d0",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "cb315055b5553e27b97415cbcf354cc7add4ca1a57ce556ece1b39b9fa734dd5"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_design_revision_reference",
        "titleRu": "Утверждённые рабочие чертежи конструкции и редакция проекта"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_repair_technical_room",
    "templateId": "concrete_foundation_interior_strip_foundation_repair_technical_room_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_repair_technical_room_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "repair",
    "contextKey": "technical_room",
    "titleRu": "ремонт ленточного фундамента в техническом помещении",
    "observedParent": {
      "definitionId": "fa35dfac-9854-5f36-a528-70c3ab380bfd",
      "version": 3,
      "definitionSha256": "112e01b820860cfda74377be28989bc136afd4e877bcaf1efcf5a8d2235b9a58",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "6bf70d37-f23b-516c-be17-24f3dbfefe99",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "1bc1c6247b0dacd91b1f627dc6cd15ab198bed474cf711c53d05be22f870fc99"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_technical_room",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_technical_room",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_service_interfaces_reference",
        "titleRu": "Рабочие чертежи вводов, оборудования и инженерных примыканий технического помещения"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_repair_wet_zone",
    "templateId": "concrete_foundation_interior_strip_foundation_repair_wet_zone_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_repair_wet_zone_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "repair",
    "contextKey": "wet_zone",
    "titleRu": "ремонт ленточного фундамента во влажной зоне",
    "observedParent": {
      "definitionId": "d5b13781-dd1b-5309-8105-cb924a0b9d9e",
      "version": 3,
      "definitionSha256": "787784a719d98c43b3562e0380d9e26693a793c15895ef6d2c963f69129fe143",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "6fb42c75-cabe-53d1-a300-84c924609a3f",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "b2d1f79b692671a029317bbaa5b7cf95a630a2ff7f3020acfda94b03a8279489"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_wet_zone",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_wet_zone",
    "scopeRu": "Ремонт подтверждённых дефектов бетонной конструкции в проектных границах: обследование, удаление повреждённого бетона, подготовка, выбранный ремонтный материал и совместимый уход; общие армирование/опалубка/поставка бетона не назначаются.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_moisture_compatibility_reference",
        "titleRu": "Фактическое увлажнение основания и подтверждённая совместимость выбранных материалов и метода"
      },
      {
        "id": "foundation_repair_applicable_local_pds_reference",
        "titleRu": "Применимый местный паспорт именно выбранного ремонтного продукта и совместимость с основанием"
      },
      {
        "id": "foundation_repair_curing_compatibility_reference",
        "titleRu": "Немедленный метод ухода и подтверждённая совместимость с последующим покрытием"
      }
    ],
    "completionMaterialGroups": [],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  },
  {
    "catalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_vibrate_repair",
    "templateId": "concrete_foundation_interior_strip_foundation_vibrate_repair_professional_expanded_v1",
    "workCatalogItemId": "work_catalog_concrete_concrete_foundation_interior_strip_foundation_vibrate_repair_professional_expanded_v1",
    "family": "strip_foundation",
    "operation": "vibrate",
    "contextKey": "repair",
    "titleRu": "вибрирование ленточного фундамента с локальным ремонтом основания",
    "observedParent": {
      "definitionId": "c2ce20ab-773f-52ef-8279-1a9f32dba37c",
      "version": 3,
      "definitionSha256": "fe08bb6d2ed1ca28d87a74b8bf5cd2ad58a020329ce3582b868dce37917dd513",
      "selectedReleaseId": "1ddfbee5-fccd-5d72-a082-061aa5876ce1",
      "definitionReleaseId": "3788cc88-701d-5cc9-9130-c61262cb9979",
      "approvedTemplateBaselineId": "ce731e37-5416-5180-980e-c24a45f7dac9",
      "snapshotSha256": "9f22f22b93045c1001c35e04da1bcacb2583536085015b884418f3baa1048194",
      "completeModelSha256": "cbb8bbaf2337ed8e4f87318e6bf5971e74769c3e2ad997573e0b8ef5d0005fe2"
    },
    "placementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_repair",
    "pairedPlacementCatalogId": "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_repair",
    "scopeRu": "Глубинное виброуплотнение только свежеуложенного пластичного бетона в подтверждённой захватке; затвердевший бетон или химическое анкерование не входят.",
    "geometryRequirementRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных.",
    "constructionFacts": [
      {
        "id": "foundation_geometry_reference",
        "titleRu": "Рабочие чертежи участка ленты: длины, поперечное сечение, границы захватки, ремонтируемые грани и координаты закладных."
      },
      {
        "id": "foundation_physical_segment_reference",
        "titleRu": "Идентификация отдельного физического участка и границ этой подработы"
      },
      {
        "id": "foundation_operation_price_scope_reference",
        "titleRu": "Подтверждённая граница ставки: материалы/оборудование/оператор/энергия/поставка и отсутствие повторной оплаты"
      },
      {
        "id": "foundation_scope_forward_decision_reference",
        "titleRu": "Утверждённая новая atomic граница и судьба прежних 59 строк без переписывания истории"
      },
      {
        "id": "foundation_existing_base_condition_reference",
        "titleRu": "Обследование существующего основания и проектная граница локального ремонта"
      }
    ],
    "completionMaterialGroups": [
      {
        "key": "vibration",
        "titleRu": "Оснащение глубинного вибратора",
        "separateRowId": "material:concrete:vibration-equipment-separate-kit",
        "includedRowIds": [
          "material:concrete:vibration-equipment-included-kit"
        ],
        "positions": [
          {
            "key": "head",
            "titleRu": "Совместимый вибронаконечник глубинного вибратора по утверждённой ведомости",
            "unitId": "piece"
          },
          {
            "key": "shaft",
            "titleRu": "Совместимый гибкий вал глубинного вибратора по утверждённой ведомости",
            "unitId": "piece"
          },
          {
            "key": "cable",
            "titleRu": "Соединительный кабель виброоборудования по проектной спецификации",
            "unitId": "m"
          },
          {
            "key": "coupling",
            "titleRu": "Совместимое соединительное изделие комплекта глубинного вибратора",
            "unitId": "piece"
          }
        ]
      }
    ],
    "materialPositions": {
      "repair_removal": [
        {
          "key": "cutting_tool",
          "titleRu": "Сменный режущий или ударный инструмент для контролируемого удаления повреждённого бетона",
          "unitId": "piece"
        },
        {
          "key": "protection_sheet",
          "titleRu": "Плёнка защитная для изоляции участка удаления повреждённого бетона",
          "unitId": "m2"
        },
        {
          "key": "waste_bag",
          "titleRu": "Мешок для сбора и перемещения отходов ремонта бетона",
          "unitId": "piece"
        },
        {
          "key": "dust_filter",
          "titleRu": "Фильтрующий элемент оборудования пылеудаления при ремонте бетона",
          "unitId": "piece"
        }
      ],
      "repair_substrate": [
        {
          "key": "surface_abrasive",
          "titleRu": "Щётка или абразивная принадлежность для подготовки ремонтируемой поверхности бетона",
          "unitId": "piece"
        },
        {
          "key": "washing_water",
          "titleRu": "Вода для промывки ремонтируемой поверхности при выбранном методе подготовки",
          "unitId": "l"
        },
        {
          "key": "masking_tape",
          "titleRu": "Лента защитная для изоляции примыканий при подготовке поверхности бетона",
          "unitId": "m"
        }
      ],
      "repair_placement": [
        {
          "key": "mixing_paddle",
          "titleRu": "Сменная смесительная насадка для приготовления выбранного ремонтного состава",
          "unitId": "piece"
        },
        {
          "key": "placement_tool",
          "titleRu": "Ручной инструмент для укладки и обработки ремонтного состава по выбранной технологии",
          "unitId": "piece"
        },
        {
          "key": "local_form_face",
          "titleRu": "Щитовая поверхность временной формы для локального формованного ремонта, только по проекту",
          "unitId": "m2"
        },
        {
          "key": "local_form_seal",
          "titleRu": "Уплотнительный профиль стыков временной ремонтной формы по проектной спецификации",
          "unitId": "m"
        }
      ],
      "repair_curing": [
        {
          "key": "curing_cover",
          "titleRu": "Покрывной материал для защиты ремонтируемого участка от преждевременного высыхания",
          "unitId": "m2"
        },
        {
          "key": "curing_water",
          "titleRu": "Вода для увлажнения ремонтного участка при подтверждённом влажностном уходе",
          "unitId": "l"
        },
        {
          "key": "cover_fastener",
          "titleRu": "Крепление покровного материала для ухода за ремонтируемой поверхностью",
          "unitId": "piece"
        }
      ]
    },
    "subworkTitlesRu": {
      "embedded-welding": "Монтажная сварка закладных деталей по утверждённой процедуре",
      "embedded-coating": "Восстановление защитного покрытия закладных деталей",
      "quality-control": "Проектный контроль и оформление результата",
      "logistics-and-waste": "Подтверждённые поставки, возврат оборудования и обращение с отходами",
      "repair-curing": "Немедленный совместимый уход за ремонтируемым участком",
      "repair-removal": "Контролируемое удаление повреждённого бетона",
      "repair-substrate": "Подготовка и обработка ремонтируемой поверхности",
      "repair-material-placement": "Приготовление, укладка и обработка ремонтного материала",
      "cast-in-embedded-installation": "Разметка, установка и фиксация закладных деталей до бетонирования",
      "fresh-concrete-leveling": "Выравнивание поверхности свежеуложенного бетона",
      "fresh-concrete-internal-vibration": "Глубинное виброуплотнение свежеуложенного бетона"
    },
    "actualProjectQuantitiesKnown": false,
    "oldDefault100Adopted": false,
    "historicalMigrationApproved": false
  }
] as const);
