// geo-data.js — Base de datos de mercado inmobiliario por zona
// Precios orientativos 2024 (Idealista · MITMA · Tinsa)
// v = venta €/m², a = alquiler €/m², vr/ar = rangos, poly = polígono mapa

const GEO=window.GEO={
  'Sevilla':{coords:[37.389,-5.984],zoom:11,municipios:{

    'San Juan de Aznalfarache':{coords:[37.352,-6.034],zoom:15,v:1350,a:8.5,vr:'1.100–1.600',ar:'7,5–10',
      note:'Aljarafe metropolitano. Buena demanda por proximidad a Sevilla capital.',slug:'san-juan-de-aznalfarache-sevilla',
      poly:[[37.365,-6.024],[37.367,-6.031],[37.364,-6.040],[37.360,-6.046],[37.354,-6.049],[37.347,-6.047],[37.342,-6.042],[37.340,-6.034],[37.343,-6.027],[37.350,-6.023],[37.358,-6.022]],
      barrios:{
        'Barrio Alto':{coords:[37.357,-6.034],v:1380,a:8.7,vr:'1.200–1.650',ar:'8–10',
          note:'Meseta alta. Mayor superficie de parcela y mejor estado medio de los inmuebles.',
          poly:[[37.365,-6.024],[37.367,-6.031],[37.364,-6.040],[37.360,-6.046],[37.354,-6.045],[37.350,-6.040],[37.350,-6.031],[37.355,-6.025]],
          subbarrios:{
            'Zona Norte':{coords:[37.362,-6.031],v:1400,a:8.8,note:'Parte más alta. Mejor acceso desde la A-8058. Promociones de los 80-90.',
              poly:[[37.365,-6.024],[37.367,-6.031],[37.364,-6.038],[37.360,-6.036],[37.357,-6.029],[37.360,-6.024]]},
            'Zona Centro':{coords:[37.357,-6.037],v:1370,a:8.6,note:'Núcleo comercial y servicios. Alta rotación de inquilinos.',
              poly:[[37.360,-6.036],[37.364,-6.038],[37.362,-6.044],[37.357,-6.043],[37.354,-6.040],[37.355,-6.035]]},
            'Zona Sur':{coords:[37.352,-6.041],v:1340,a:8.5,note:'Colindante con Mairena. Tipología más variada.',
              poly:[[37.354,-6.040],[37.357,-6.043],[37.354,-6.047],[37.350,-6.046],[37.350,-6.040]]},
          }
        },
        'Barrio Bajo':{coords:[37.345,-6.032],v:1180,a:7.6,vr:'950–1.400',ar:'6,5–9',
          note:'Zona baja histórica junto al Guadalquivir. Precios más bajos, mayor yield potencial pero menor liquidez.',
          poly:[[37.350,-6.031],[37.350,-6.040],[37.347,-6.047],[37.342,-6.042],[37.340,-6.034],[37.343,-6.027],[37.348,-6.026]],
          subbarrios:{
            'Ribera Norte':{coords:[37.348,-6.029],v:1200,a:7.8,note:'Mejor conexión con Sevilla. Rehabilitación activa.',
              poly:[[37.350,-6.026],[37.350,-6.033],[37.346,-6.033],[37.344,-6.028],[37.347,-6.025]]},
            'Casco Histórico':{coords:[37.345,-6.036],v:1150,a:7.5,note:'Edificación antigua. Oportunidad de compra a bajo precio con reform integral.',
              poly:[[37.348,-6.033],[37.350,-6.039],[37.347,-6.042],[37.342,-6.040],[37.342,-6.034],[37.345,-6.031]]},
            'Ribera Sur':{coords:[37.342,-6.040],v:1120,a:7.3,note:'Zona más deprimida. Mayor potencial pero riesgo de vacancia elevado.',
              poly:[[37.344,-6.039],[37.347,-6.042],[37.344,-6.048],[37.340,-6.045],[37.340,-6.038]]},
          }
        },
      }
    },

    'Mairena del Aljarafe':{coords:[37.344,-6.063],zoom:14,v:1650,a:9.5,vr:'1.400–1.900',ar:'8,5–11',
      note:'Aljarafe consolidado. Mayor poder adquisitivo y demanda más solvente que San Juan.',slug:'mairena-del-aljarafe-sevilla',
      poly:[[37.358,-6.050],[37.361,-6.057],[37.358,-6.070],[37.352,-6.078],[37.343,-6.079],[37.335,-6.073],[37.332,-6.061],[37.337,-6.051],[37.347,-6.047]],
      barrios:{
        'Casco Urbano':{coords:[37.344,-6.062],v:1600,a:9.2,vr:'1.350–1.850',ar:'8–10,5',note:'Zona central. Buena demanda de alquiler familiar.',
          poly:[[37.350,-6.054],[37.353,-6.062],[37.350,-6.072],[37.343,-6.074],[37.338,-6.069],[37.338,-6.058],[37.345,-6.053]],
          subbarrios:{
            'Centro':{coords:[37.344,-6.062],v:1620,a:9.3,note:'Servicios y comercio. Alta demanda.',
              poly:[[37.347,-6.057],[37.350,-6.062],[37.347,-6.068],[37.342,-6.068],[37.340,-6.062],[37.343,-6.057]]},
            'Zona Residencial Norte':{coords:[37.350,-6.060],v:1680,a:9.5,note:'Urbanizaciones de los 90-2000. Buen estado general.',
              poly:[[37.352,-6.054],[37.355,-6.060],[37.352,-6.066],[37.348,-6.064],[37.347,-6.057]]},
          }
        },
        'Las Palmeras':{coords:[37.338,-6.065],v:1700,a:9.8,vr:'1.500–1.950',ar:'9–11',note:'Zona residencial de mayor calidad. Buena demanda familiar.',
          poly:[[37.343,-6.060],[37.345,-6.070],[37.340,-6.075],[37.333,-6.072],[37.333,-6.063],[37.338,-6.058]],
          subbarrios:{
            'Las Palmeras Norte':{coords:[37.341,-6.063],v:1720,a:9.9,note:'',poly:[[37.343,-6.060],[37.345,-6.066],[37.341,-6.068],[37.338,-6.064],[37.338,-6.059]]},
            'Las Palmeras Sur':{coords:[37.337,-6.068],v:1680,a:9.7,note:'',poly:[[37.341,-6.065],[37.343,-6.070],[37.339,-6.074],[37.334,-6.072],[37.335,-6.065]]},
          }
        },
      }
    },

    'Sevilla':{coords:[37.389,-5.984],zoom:13,v:2250,a:12.5,vr:'1.400–4.500',ar:'9–20',
      note:'Media ciudad. Varía mucho por barrio.',slug:'sevilla-sevilla',
      barrios:{
        'Triana':{coords:[37.381,-6.002],v:2900,a:15,vr:'2.400–3.500',ar:'13–17',note:'Muy demandado. Buena liquidez para flip y BTR.',
          poly:[[37.390,-5.997],[37.390,-6.005],[37.384,-6.012],[37.376,-6.009],[37.373,-6.001],[37.378,-5.993],[37.386,-5.994]],
          subbarrios:{
            'Triana Centro':{coords:[37.381,-6.002],v:3100,a:16,note:'Zona más cotizada. Alta demanda turística y residencial.',poly:[[37.387,-5.998],[37.387,-6.005],[37.382,-6.008],[37.377,-6.005],[37.377,-5.997],[37.383,-5.996]]},
            'Triana Sur':{coords:[37.376,-6.003],v:2700,a:14,note:'Algo más tranquilo. Mejor precio de entrada.',poly:[[37.381,-6.005],[37.382,-6.010],[37.375,-6.010],[37.372,-6.004],[37.374,-5.999],[37.380,-6.000]]},
          }
        },
        'Nervión':{coords:[37.385,-5.964],v:3100,a:16,vr:'2.600–3.700',ar:'14–18',note:'Zona prime residencial. Alta liquidez.',
          poly:[[37.393,-5.970],[37.393,-5.958],[37.385,-5.955],[37.378,-5.960],[37.378,-5.970],[37.385,-5.974]],
          subbarrios:{
            'Nervión Norte':{coords:[37.390,-5.963],v:3200,a:16.5,note:'Próximo a estación Sevilla-Santa Justa.',poly:[[37.393,-5.970],[37.393,-5.958],[37.388,-5.957],[37.386,-5.964],[37.387,-5.971]]},
            'Nervión Sur':{coords:[37.382,-5.963],v:3000,a:15.5,note:'Zona más tranquila. Buen perfil de inquilino.',poly:[[37.387,-5.964],[37.387,-5.957],[37.380,-5.958],[37.378,-5.963],[37.380,-5.969]]},
          }
        },
        'Macarena':{coords:[37.402,-5.982],v:1900,a:11,vr:'1.600–2.200',ar:'9,5–12',note:'Barrio en transformación. Buena relación precio/yield.',
          poly:[[37.412,-5.990],[37.412,-5.974],[37.404,-5.970],[37.396,-5.975],[37.396,-5.991],[37.404,-5.994]],
          subbarrios:{
            'Macarena Norte':{coords:[37.408,-5.982],v:1850,a:10.7,note:'Zona más obrera. Mayor yield potencial.',poly:[[37.412,-5.990],[37.412,-5.978],[37.406,-5.975],[37.403,-5.982],[37.404,-5.992]]},
            'Macarena Sur':{coords:[37.400,-5.981],v:1950,a:11.2,note:'Mejor conectado con el centro. Gentrificación en proceso.',poly:[[37.404,-5.975],[37.404,-5.992],[37.397,-5.991],[37.396,-5.978],[37.400,-5.973]]},
          }
        },
        'Los Remedios':{coords:[37.375,-5.997],v:2800,a:14,vr:'2.400–3.300',ar:'12–16',note:'Zona consolidada y muy demandada. Buen perfil de inquilino.',
          poly:[[37.381,-5.993],[37.381,-6.001],[37.375,-6.001],[37.369,-5.996],[37.370,-5.988],[37.377,-5.985]],
          subbarrios:{
            'Remedios Norte':{coords:[37.379,-5.993],v:2900,a:14.5,note:'Más próximo al Casco Antiguo.',poly:[[37.382,-5.990],[37.382,-5.997],[37.377,-5.998],[37.374,-5.993],[37.377,-5.988]]},
            'Remedios Sur':{coords:[37.373,-5.994],v:2700,a:13.5,note:'Zona más tranquila y familiar.',poly:[[37.377,-5.996],[37.377,-6.002],[37.370,-6.001],[37.368,-5.995],[37.371,-5.989],[37.375,-5.993]]},
          }
        },
        'Doctor Fedriani':{coords:[37.408,-5.977],v:1750,a:10.5,vr:'1.400–2.000',ar:'9–12',note:'Macarena norte. Precios aún contenidos. Buenos comparables de yield.',
          poly:[[37.415,-5.984],[37.415,-5.970],[37.408,-5.968],[37.403,-5.972],[37.403,-5.984],[37.408,-5.987]],
          subbarrios:{
            'Zona Fedriani':{coords:[37.410,-5.976],v:1800,a:10.7,note:'Eje principal. Mejor demanda.',poly:[[37.414,-5.980],[37.414,-5.970],[37.408,-5.970],[37.406,-5.977],[37.408,-5.983]]},
            'Zona Cartuja':{coords:[37.408,-5.983],v:1700,a:10.2,note:'Colindante con Cartuja. En transformación.',poly:[[37.412,-5.983],[37.412,-5.990],[37.405,-5.989],[37.404,-5.982],[37.408,-5.980]]},
          }
        },
        'Heliópolis':{coords:[37.370,-5.990],v:2300,a:12,vr:'2.000–2.700',ar:'10,5–13,5',note:'Zona media-alta. Estable. Buena demanda de profesionales.',
          poly:[[37.377,-5.985],[37.377,-5.996],[37.370,-5.998],[37.363,-5.994],[37.363,-5.983],[37.370,-5.980]],
          subbarrios:{
            'Heliópolis Norte':{coords:[37.374,-5.989],v:2400,a:12.3,note:'',poly:[[37.377,-5.985],[37.377,-5.993],[37.372,-5.994],[37.369,-5.988],[37.371,-5.982]]},
            'Heliópolis Sur':{coords:[37.367,-5.989],v:2200,a:11.7,note:'',poly:[[37.372,-5.991],[37.372,-5.997],[37.364,-5.996],[37.363,-5.989],[37.367,-5.986]]},
          }
        },
        'Cerro-Amate':{coords:[37.362,-5.970],v:1300,a:8.5,vr:'1.050–1.550',ar:'7,5–10',note:'Zona sur. Yield alta potencial pero menor liquidez. Cuidado con vacancia.',
          poly:[[37.370,-5.977],[37.370,-5.960],[37.360,-5.958],[37.354,-5.964],[37.354,-5.976],[37.362,-5.980]],
          subbarrios:{
            'Cerro Norte':{coords:[37.366,-5.968],v:1350,a:8.7,note:'Mejor conectado. Mayor demanda.',poly:[[37.370,-5.975],[37.370,-5.961],[37.364,-5.960],[37.361,-5.967],[37.363,-5.975]]},
            'Amate':{coords:[37.359,-5.969],v:1250,a:8.3,note:'Zona más periférica. Mayor riesgo.',poly:[[37.364,-5.973],[37.364,-5.961],[37.356,-5.962],[37.354,-5.970],[37.357,-5.977]]},
          }
        },
        'Casco Antiguo':{coords:[37.389,-5.990],v:3800,a:17,vr:'3.000–5.500',ar:'14–22',note:'Centro histórico. Alta demanda turística y residencial premium. Licencias de obra complejas.',
          poly:[[37.397,-5.997],[37.397,-5.984],[37.389,-5.979],[37.381,-5.984],[37.380,-5.996],[37.388,-6.001]],
          subbarrios:{
            'Santa Cruz':{coords:[37.387,-5.985],v:4800,a:20,note:'El barrio más cotizado. Alta rotación turística. Cuidado con restricciones de alquiler.',poly:[[37.393,-5.990],[37.393,-5.981],[37.386,-5.979],[37.382,-5.984],[37.383,-5.992],[37.389,-5.994]]},
            'Arenal':{coords:[37.386,-5.995],v:4200,a:18,note:'Junto al río. Muy turístico. Buena demanda BTR larga estancia.',poly:[[37.391,-5.994],[37.391,-6.001],[37.384,-6.002],[37.381,-5.997],[37.384,-5.991],[37.389,-5.992]]},
            'Alfalfa':{coords:[37.393,-5.990],v:3800,a:17,note:'Zona de bares y comercio. Perfil joven.',poly:[[37.397,-5.996],[37.397,-5.985],[37.392,-5.983],[37.389,-5.989],[37.390,-5.997]]},
          }
        },
      }
    },

    'Camas':{coords:[37.402,-6.035],zoom:14,v:1250,a:8,vr:'1.000–1.500',ar:'7–9',note:'Municipio limítrofe con Sevilla. Precios contenidos.',slug:'camas-sevilla',
      poly:[[37.415,-6.024],[37.417,-6.032],[37.413,-6.042],[37.406,-6.047],[37.397,-6.044],[37.393,-6.035],[37.397,-6.025],[37.407,-6.022]],
      barrios:{
        'Casco Urbano':{coords:[37.402,-6.034],v:1250,a:8,note:'',poly:[[37.410,-6.026],[37.412,-6.035],[37.407,-6.043],[37.400,-6.044],[37.396,-6.037],[37.398,-6.027],[37.405,-6.024]],subbarrios:{}},
      }
    },

    'Bormujos':{coords:[37.357,-6.076],zoom:14,v:1700,a:9.5,vr:'1.500–2.000',ar:'8,5–11',note:'Aljarafe. Buena demanda residencial familiar.',slug:'bormujos-sevilla',
      poly:[[37.368,-6.063],[37.370,-6.073],[37.365,-6.084],[37.356,-6.088],[37.347,-6.085],[37.344,-6.075],[37.349,-6.065],[37.360,-6.062]],
      barrios:{
        'Bormujos Centro':{coords:[37.357,-6.076],v:1700,a:9.5,note:'',poly:[[37.365,-6.067],[37.367,-6.076],[37.361,-6.084],[37.353,-6.084],[37.349,-6.075],[37.355,-6.066]],subbarrios:{}},
      }
    },

    'Tomares':{coords:[37.365,-6.057],zoom:14,v:2150,a:11.5,vr:'1.800–2.500',ar:'10–13',note:'Aljarafe premium. Alta demanda y poca rotación. El municipio más caro del Aljarafe.',slug:'tomares-sevilla',
      poly:[[37.375,-6.044],[37.377,-6.054],[37.373,-6.065],[37.364,-6.069],[37.356,-6.065],[37.354,-6.055],[37.360,-6.045],[37.370,-6.043]],
      barrios:{
        'Tomares Residencial':{coords:[37.365,-6.056],v:2200,a:11.7,note:'Urbanizaciones de alta calidad. Demanda muy solvente.',poly:[[37.374,-6.046],[37.375,-6.057],[37.370,-6.065],[37.362,-6.066],[37.357,-6.058],[37.360,-6.048],[37.368,-6.045]],subbarrios:{}},
      }
    },

    'Dos Hermanas':{coords:[37.284,-5.923],zoom:13,v:1550,a:8,vr:'1.300–1.800',ar:'7–9,5',note:'',slug:'dos-hermanas-sevilla',
      poly:[[37.310,-5.948],[37.312,-5.905],[37.290,-5.890],[37.265,-5.905],[37.258,-5.940],[37.278,-5.958],[37.300,-5.958]],
      barrios:{
        'Centro':{coords:[37.284,-5.924],v:1550,a:8,note:'',poly:[[37.294,-5.934],[37.295,-5.914],[37.281,-5.910],[37.273,-5.918],[37.274,-5.934],[37.283,-5.939]],subbarrios:{}},
      }
    },
  }},

  'Madrid':{coords:[40.417,-3.704],zoom:11,municipios:{
    'Madrid':{coords:[40.417,-3.704],zoom:12,v:4200,a:21,vr:'2.000–9.000',ar:'12–35',note:'Media ciudad.',slug:'madrid',
      poly:[[40.536,-3.833],[40.560,-3.630],[40.478,-3.570],[40.370,-3.580],[40.340,-3.640],[40.350,-3.820],[40.440,-3.870]],
      barrios:{
        'Carabanchel':{coords:[40.383,-3.734],v:2800,a:16,vr:'2.400–3.300',ar:'14–18',note:'En revalorización activa. Buena yield y demanda creciente.',
          poly:[[40.400,-3.755],[40.400,-3.718],[40.380,-3.710],[40.365,-3.718],[40.365,-3.750],[40.380,-3.760]],
          subbarrios:{
            'Carabanchel Alto':{coords:[40.390,-3.737],v:2900,a:16.5,note:'Mejor acceso y servicios.',poly:[[40.400,-3.750],[40.400,-3.723],[40.390,-3.720],[40.384,-3.730],[40.385,-3.750]]},
            'Carabanchel Bajo':{coords:[40.374,-3.730],v:2700,a:15.5,note:'Más antiguo. Mayor potencial de reforma.',poly:[[40.385,-3.730],[40.385,-3.718],[40.368,-3.715],[40.365,-3.725],[40.367,-3.742],[40.376,-3.746]]},
          }
        },
        'Vallecas':{coords:[40.389,-3.661],v:2300,a:14,vr:'1.900–2.800',ar:'12–16',note:'Yield alta. Mayor riesgo de impago que otras zonas.',
          poly:[[40.410,-3.685],[40.410,-3.640],[40.385,-3.633],[40.370,-3.645],[40.372,-3.678],[40.393,-3.690]],
          subbarrios:{
            'Puente de Vallecas':{coords:[40.395,-3.665],v:2400,a:14.5,note:'Zona más consolidada. Mejor perfil de demanda.',poly:[[40.408,-3.680],[40.408,-3.650],[40.393,-3.645],[40.385,-3.655],[40.387,-3.677],[40.400,-3.683]]},
            'Villa de Vallecas':{coords:[40.378,-3.658],v:2200,a:13.5,note:'Zona más periférica. Precios más bajos.',poly:[[40.390,-3.668],[40.390,-3.640],[40.372,-3.638],[37.366,-3.650],[40.370,-3.670],[40.380,-3.675]]},
          }
        },
        'Salamanca':{coords:[40.425,-3.679],v:7500,a:28,vr:'6.000–10.000',ar:'22–35',note:'Barrio prime. Muy alta liquidez. Tickets altos.',
          poly:[[40.440,-3.695],[40.440,-3.665],[40.420,-3.660],[40.410,-3.668],[40.411,-3.693],[40.425,-3.699]],
          subbarrios:{
            'Recoletos':{coords:[40.426,-3.690],v:8500,a:30,note:'Top del mercado madrileño.',poly:[[40.436,-3.698],[40.436,-3.680],[40.424,-3.676],[40.420,-3.685],[40.422,-3.698]]},
            'Goya':{coords:[40.425,-3.673],v:7000,a:27,note:'Algo más accesible pero igualmente premium.',poly:[[40.435,-3.679],[40.435,-3.663],[40.418,-3.660],[40.416,-3.670],[40.420,-3.679]]},
          }
        },
        'Tetuán':{coords:[40.459,-3.708],v:3800,a:19,vr:'3.200–4.500',ar:'17–22',note:'En revalorización. Buen punto de entrada para flip.',
          poly:[[40.474,-3.722],[40.474,-3.693],[40.454,-3.689],[40.443,-3.698],[40.445,-3.720],[40.460,-3.726]],
          subbarrios:{
            'Berruguete':{coords:[40.460,-3.705],v:3900,a:19.5,note:'',poly:[[40.468,-3.718],[40.468,-3.698],[40.454,-3.695],[40.450,-3.706],[40.453,-3.720]]},
            'Valdeacederas':{coords:[40.467,-3.710],v:3700,a:18.5,note:'',poly:[[40.474,-3.720],[40.474,-3.700],[40.466,-3.698],[40.462,-3.708],[40.463,-3.722]]},
          }
        },
        'Usera':{coords:[40.388,-3.716],v:3000,a:16,vr:'2.600–3.500',ar:'14–18',note:'Zona multicultural en revalorización. Buena yield.',
          poly:[[40.400,-3.728],[40.400,-3.703],[40.383,-3.700],[40.374,-3.708],[40.376,-3.727],[40.391,-3.733]],
          subbarrios:{
            'Pradolongo':{coords:[40.393,-3.713],v:3100,a:16.3,note:'',poly:[[40.400,-3.724],[40.400,-3.707],[40.391,-3.706],[40.387,-3.717],[40.389,-3.728]]},
            'Orcasitas':{coords:[40.381,-3.714],v:2900,a:15.7,note:'',poly:[[40.388,-3.707],[40.388,-3.724],[40.376,-3.727],[40.374,-3.717],[40.379,-3.706]]},
          }
        },
      }
    },
    'Getafe':{coords:[40.306,-3.733],zoom:13,v:2500,a:14.5,vr:'2.100–3.000',ar:'12–17',note:'',slug:'getafe-madrid',
      poly:[[40.330,-3.760],[40.330,-3.705],[40.290,-3.700],[40.275,-3.715],[40.278,-3.755],[40.308,-3.768]],
      barrios:{}
    },
    'Alcorcón':{coords:[40.349,-3.825],zoom:13,v:2300,a:14,vr:'2.000–2.700',ar:'12–16',note:'',slug:'alcorcon-madrid',
      poly:[[40.370,-3.846],[40.370,-3.806],[40.338,-3.800],[40.325,-3.812],[40.330,-3.848],[40.352,-3.855]],
      barrios:{}
    },
  }},

  'Barcelona':{coords:[41.385,2.173],zoom:11,municipios:{
    'Barcelona':{coords:[41.385,2.173],zoom:13,v:4500,a:22,vr:'2.500–12.000',ar:'14–40',note:'Media ciudad.',slug:'barcelona',
      poly:[[41.468,2.070],[41.468,2.228],[41.410,2.230],[41.350,2.167],[41.345,2.090],[41.410,2.065]],
      barrios:{
        'Eixample':{coords:[41.394,2.162],v:5500,a:25,vr:'4.500–6.500',ar:'21–29',note:'El barrio más líquido de Barcelona. Alta demanda BTR y flip.',
          poly:[[41.408,2.140],[41.408,2.180],[41.388,2.185],[41.378,2.178],[41.380,2.140],[41.398,2.135]],
          subbarrios:{
            'Esquerra de l\'Eixample':{coords:[41.393,2.151],v:5300,a:24.5,note:'Zona LGBT. Alta rotación de alquiler. Buen perfil flip.',poly:[[41.407,2.142],[41.407,2.163],[41.388,2.166],[41.381,2.160],[41.383,2.142],[41.398,2.138]]},
            'Dreta de l\'Eixample':{coords:[41.394,2.172],v:5700,a:25.5,note:'Más cerca de Diagonal y Passeig de Gràcia.',poly:[[41.407,2.163],[41.407,2.182],[41.389,2.184],[41.381,2.178],[41.382,2.162],[41.395,2.160]]},
          }
        },
        'Gràcia':{coords:[41.403,2.156],v:5000,a:23,vr:'4.000–6.000',ar:'19–27',note:'Barrio con mucho carácter. Alta demanda. Buenos retornos en BTR.',
          poly:[[41.420,2.142],[41.420,2.172],[41.408,2.178],[41.398,2.178],[41.396,2.142],[41.408,2.138]],
          subbarrios:{
            'Vila de Gràcia':{coords:[41.406,2.156],v:5200,a:23.5,note:'Núcleo tradicional. Muy demandado.',poly:[[41.416,2.144],[41.416,2.165],[41.405,2.168],[41.398,2.163],[41.400,2.145]]},
            'Camp d\'en Grassot':{coords:[41.412,2.164],v:4800,a:22.5,note:'Zona norte. Algo más tranquila.',poly:[[41.420,2.158],[41.420,2.172],[41.408,2.175],[41.405,2.165],[41.408,2.156]]},
          }
        },
        'Nou Barris':{coords:[41.441,2.174],v:2800,a:15,vr:'2.300–3.400',ar:'13–17',note:'Yield alta. En transformación. Mayor riesgo que Eixample.',
          poly:[[41.465,2.157],[41.465,2.193],[41.445,2.197],[41.430,2.187],[41.428,2.157],[41.448,2.153]],
          subbarrios:{
            'Roquetes':{coords:[41.455,2.170],v:2700,a:14.5,note:'Zona alta. Mayor riesgo pero mayor yield.',poly:[[41.463,2.157],[41.463,2.178],[41.450,2.180],[41.445,2.168],[41.447,2.155]]},
            'Trinitat Vella':{coords:[41.441,2.181],v:2900,a:15.5,note:'Mejor conectado. Más demanda.',poly:[[41.450,2.175],[41.450,2.195],[41.433,2.195],[41.430,2.183],[41.435,2.172]]},
          }
        },
      }
    },
    'Badalona':{coords:[41.445,2.247],zoom:13,v:2600,a:15,vr:'2.000–3.200',ar:'12–18',note:'',slug:'badalona-barcelona',
      poly:[[41.468,2.220],[41.468,2.270],[41.435,2.275],[41.420,2.255],[41.425,2.218],[41.450,2.215]],
      barrios:{}
    },
  }},

  'Valencia':{coords:[39.470,-0.376],zoom:11,municipios:{
    'Valencia':{coords:[39.470,-0.376],zoom:13,v:2200,a:11.5,vr:'1.200–5.000',ar:'7–20',note:'Media ciudad.',slug:'valencia-valencia',
      poly:[[39.520,-0.415],[39.520,-0.330],[39.440,-0.325],[39.420,-0.360],[39.430,-0.415],[39.480,-0.430]],
      barrios:{
        'Ciutat Vella':{coords:[39.475,-0.377],v:3500,a:16,vr:'2.800–4.500',ar:'13–20',note:'Benchmark mínimo 9% bruta. Alta demanda turística.',
          poly:[[39.482,-0.388],[39.482,-0.370],[39.471,-0.365],[39.466,-0.372],[39.468,-0.388],[39.476,-0.392]],
          subbarrios:{
            'El Carmen':{coords:[39.476,-0.380],v:3800,a:17,note:'El barrio más cotizado del casco histórico.',poly:[[39.481,-0.388],[39.481,-0.375],[39.474,-0.372],[39.471,-0.380],[39.474,-0.389]]},
            'La Xerea':{coords:[39.472,-0.370],v:3200,a:15,note:'Zona más tranquila del centro.',poly:[[39.479,-0.374],[39.479,-0.362],[39.469,-0.362],[39.466,-0.370],[39.470,-0.376]]},
          }
        },
        "L'Eixample":{coords:[39.469,-0.370],v:3200,a:15,vr:'2.600–4.000',ar:'12–18',note:'',
          poly:[[39.480,-0.380],[39.480,-0.355],[39.462,-0.352],[39.456,-0.365],[39.460,-0.381],[39.471,-0.384]],
          subbarrios:{
            'Ruzafa':{coords:[39.462,-0.370],v:3500,a:16,note:'Barrio de moda. Muy alta demanda BTR joven.',poly:[[39.471,-0.378],[39.471,-0.360],[39.460,-0.358],[39.455,-0.368],[39.458,-0.380],[39.466,-0.383]]},
            "Gran Via":{coords:[39.472,-0.367],v:3000,a:14.5,note:'Eje principal. Buena demanda.',poly:[[39.480,-0.377],[39.480,-0.358],[39.471,-0.355],[39.468,-0.363],[39.470,-0.379]]},
          }
        },
        'Benimaclet':{coords:[39.483,-0.358],v:2300,a:12.5,vr:'1.900–2.800',ar:'10,5–14',note:'Benchmark mínimo 10% bruta. Alta demanda universitaria.',
          poly:[[39.496,-0.368],[39.496,-0.348],[39.478,-0.344],[39.470,-0.352],[39.472,-0.370],[39.484,-0.373]],
          subbarrios:{
            'Benimaclet Centre':{coords:[39.483,-0.356],v:2400,a:13,note:'Núcleo del barrio. Muy demandado.',poly:[[39.490,-0.363],[39.490,-0.348],[39.479,-0.346],[39.475,-0.355],[39.477,-0.366],[39.486,-0.368]]},
            'Camins al Grau':{coords:[39.476,-0.356],v:2200,a:12,note:'Zona sur. Más asequible.',poly:[[39.479,-0.366],[39.479,-0.348],[39.470,-0.348],[40.468,-0.358],[40.469,-0.370]]},
          }
        },
        'Quatre Carreres':{coords:[39.448,-0.371],v:2100,a:11,vr:'1.700–2.600',ar:'9,5–13',note:'Benchmark mínimo 9,5% bruta.',
          poly:[[39.465,-0.385],[39.465,-0.358],[39.440,-0.355],[39.428,-0.365],[39.432,-0.388],[39.452,-0.393]],
          subbarrios:{
            'Malilla':{coords:[39.449,-0.376],v:2050,a:10.8,note:'Zona sur. Demanda estable.',poly:[[39.460,-0.383],[39.460,-0.362],[39.446,-0.360],[39.440,-0.370],[39.443,-0.386],[39.455,-0.389]]},
            'En Corts':{coords:[39.459,-0.368],v:2150,a:11.2,note:'Más próximo al centro.',poly:[[39.465,-0.378],[39.465,-0.360],[39.457,-0.358],[39.453,-0.366],[39.455,-0.380]]},
          }
        },
      }
    },
    'Torrent':{coords:[39.435,-0.468],zoom:13,v:1750,a:9.5,vr:'1.400–2.100',ar:'8–11',note:'',slug:'torrent-valencia',
      poly:[[39.460,-0.490],[39.460,-0.446],[39.426,-0.440],[39.410,-0.455],[39.415,-0.490],[39.440,-0.500]],
      barrios:{}
    },
  }},

  'Málaga':{coords:[36.721,-4.421],zoom:11,municipios:{
    'Málaga':{coords:[36.721,-4.421],zoom:13,v:3200,a:15,vr:'1.800–7.000',ar:'10–25',note:'',slug:'malaga',
      poly:[[36.760,-4.500],[36.760,-4.360],[36.700,-4.340],[36.670,-4.380],[36.680,-4.500],[36.720,-4.520]],
      barrios:{
        'Centro':{coords:[36.721,-4.426],v:4500,a:18,vr:'3.500–6.000',ar:'15–22',note:'Alta demanda. Restricciones crecientes al alquiler turístico.',
          poly:[[36.730,-4.440],[36.730,-4.415],[36.715,-4.410],[36.708,-4.420],[36.710,-4.440],[36.722,-4.445]],
          subbarrios:{
            'Soho':{coords:[36.715,-4.428],v:4800,a:19,note:'Barrio de moda. Muy revalorizado en los últimos 5 años.',poly:[[36.723,-4.438],[36.723,-4.420],[36.712,-4.418],[36.708,-4.428],[36.712,-4.440]]},
            'La Goleta':{coords:[36.724,-4.419],v:4300,a:17.5,note:'Zona histórica. Alta demanda.',poly:[[36.731,-4.432],[36.731,-4.413],[36.720,-4.411],[36.716,-4.420],[36.718,-4.434]]},
          }
        },
        'Este':{coords:[36.717,-4.394],v:2500,a:13,vr:'2.000–3.200',ar:'11–15',note:'Zona residencial menos turística. Mejor yield.',
          poly:[[36.735,-4.410],[36.735,-4.370],[36.710,-4.368],[36.700,-4.382],[36.703,-4.412],[36.720,-4.418]],
          subbarrios:{
            'Pedregalejo':{coords:[36.716,-4.385],v:2800,a:14,note:'Zona de playa. Alta demanda en verano.',poly:[[36.727,-4.398],[36.727,-4.372],[36.712,-4.370],[36.708,-4.382],[36.712,-4.400]]},
            'El Palo':{coords:[36.718,-4.374],v:2200,a:12,note:'Más asequible. Mayor yield potencial.',poly:[[36.732,-4.383],[36.732,-4.363],[36.715,-4.360],[36.708,-4.372],[36.712,-4.385],[36.723,-4.386]]},
          }
        },
      }
    },
    'Marbella':{coords:[36.510,-4.883],zoom:13,v:4800,a:20,vr:'3.000–15.000',ar:'14–35',note:'Mercado muy heterogéneo. Tickets altos.',slug:'marbella-malaga',
      poly:[[36.545,-4.942],[36.545,-4.825],[36.492,-4.820],[36.477,-4.858],[36.484,-4.940],[36.518,-4.952]],
      barrios:{}
    },
  }},

  'Alicante':{coords:[38.345,-0.481],zoom:11,municipios:{
    'Alicante':{coords:[38.345,-0.481],zoom:13,v:1900,a:10,vr:'1.200–4.000',ar:'7–16',note:'',slug:'alicante',
      poly:[[38.380,-0.520],[38.380,-0.440],[38.330,-0.430],[38.308,-0.460],[38.318,-0.518],[38.355,-0.532]],
      barrios:{
        'Centro':{coords:[38.345,-0.481],v:2500,a:12,note:'',poly:[[38.360,-0.498],[38.360,-0.464],[38.335,-0.460],[38.325,-0.474],[38.330,-0.500],[38.348,-0.504]],subbarrios:{}},
        'Playa San Juan':{coords:[38.368,-0.440],v:2800,a:13,note:'Alta demanda extranjera y vacacional.',poly:[[38.385,-0.456],[38.385,-0.425],[38.357,-0.422],[38.350,-0.440],[38.355,-0.459],[38.372,-0.462]],subbarrios:{}},
      }
    },
    'Torrevieja':{coords:[37.978,-0.684],zoom:13,v:1600,a:9,vr:'1.200–2.500',ar:'7–12',note:'Fuerte demanda extranjera.',slug:'torrevieja-alicante',
      poly:[[38.010,-0.720],[38.010,-0.648],[37.962,-0.645],[37.945,-0.670],[37.953,-0.715],[37.985,-0.728]],
      barrios:{}
    },
  }},

  'Vizcaya':{coords:[43.263,-2.935],zoom:11,municipios:{
    'Bilbao':{coords:[43.263,-2.935],zoom:13,v:3800,a:17,vr:'2.500–6.000',ar:'13–25',note:'',slug:'bilbao',
      poly:[[43.292,-2.980],[43.292,-2.885],[43.246,-2.880],[43.232,-2.910],[43.240,-2.978],[43.268,-2.992]],
      barrios:{
        'Abando':{coords:[43.263,-2.927],v:4800,a:20,note:'Zona prime. Muy alta liquidez.',poly:[[43.278,-2.945],[43.278,-2.912],[43.258,-2.908],[43.250,-2.920],[43.254,-2.945],[43.268,-2.950]],subbarrios:{}},
        'Deusto':{coords:[43.272,-2.960],v:3200,a:15,note:'Zona universitaria. Alta demanda BTR.',poly:[[43.288,-2.978],[43.288,-2.942],[43.265,-2.940],[43.258,-2.952],[43.262,-2.980],[43.278,-2.985]],subbarrios:{}},
        'Rekalde':{coords:[43.250,-2.930],v:2800,a:14,note:'Zona obrera en revalorización. Buena yield.',poly:[[43.263,-2.950],[43.263,-2.914],[43.242,-2.910],[43.232,-2.922],[43.238,-2.950],[43.252,-2.956]],subbarrios:{}},
      }
    },
  }},

  'Guipúzcoa':{coords:[43.318,-1.981],zoom:11,municipios:{
    'San Sebastián':{coords:[43.318,-1.981],zoom:13,v:6000,a:23,vr:'4.000–12.000',ar:'17–30',note:'Uno de los mercados más caros de España. Muy poca oferta.',slug:'san-sebastian',
      poly:[[43.342,-2.020],[43.342,-1.940],[43.300,-1.935],[43.287,-1.960],[43.295,-2.018],[43.320,-2.030]],
      barrios:{
        'Centro-Parte Vieja':{coords:[43.323,-1.983],v:8000,a:28,note:'Muy escasa oferta. Alta demanda turística.',poly:[[43.330,-1.998],[43.330,-1.968],[43.314,-1.966],[43.308,-1.980],[43.314,-1.999]],subbarrios:{}},
        'Gros':{coords:[43.320,-1.970],v:6500,a:24,note:'Barrio moderno. Alta demanda joven.',poly:[[43.329,-1.978],[43.329,-1.955],[43.313,-1.953],[43.308,-1.966],[43.312,-1.980]],subbarrios:{}},
      }
    },
  }},

  'Baleares':{coords:[39.570,2.650],zoom:10,municipios:{
    'Palma':{coords:[39.570,2.650],zoom:13,v:4200,a:19,vr:'2.500–10.000',ar:'13–30',note:'Mercado muy tensionado. Restricciones al alquiler turístico.',slug:'palma-de-mallorca',
      poly:[[39.610,2.598],[39.610,2.698],[39.555,2.708],[39.528,2.670],[39.538,2.598],[39.578,2.582]],
      barrios:{
        'Centro Histórico':{coords:[39.570,2.650],v:5500,a:24,note:'Alta demanda. Licencias difíciles.',poly:[[39.582,2.630],[39.582,2.668],[39.561,2.672],[39.552,2.657],[39.558,2.630],[39.573,2.625]],subbarrios:{}},
        'Santa Catalina':{coords:[39.572,2.637],v:5000,a:22,note:'Barrio de moda. Muy demandado.',poly:[[39.582,2.625],[39.582,2.643],[39.563,2.645],[39.557,2.634],[39.562,2.622],[39.575,2.620]],subbarrios:{}},
      }
    },
  }},

  'Zaragoza':{coords:[41.649,-0.889],zoom:11,municipios:{
    'Zaragoza':{coords:[41.649,-0.889],zoom:13,v:1750,a:9,vr:'1.200–3.000',ar:'7–14',note:'',slug:'zaragoza',
      poly:[[41.700,-0.960],[41.700,-0.820],[41.605,-0.815],[41.585,-0.855],[41.598,-0.955],[41.650,-0.975]],
      barrios:{
        'Centro':{coords:[41.649,-0.877],v:2500,a:12,note:'',poly:[[41.660,-0.900],[41.660,-0.856],[41.638,-0.853],[41.628,-0.870],[41.634,-0.900],[41.649,-0.907]],subbarrios:{}},
        'Delicias':{coords:[41.643,-0.916],v:1600,a:8.5,note:'Zona obrera. Yield potencialmente alta.',poly:[[41.658,-0.935],[41.658,-0.904],[41.635,-0.901],[41.625,-0.913],[41.630,-0.936],[41.648,-0.942]],subbarrios:{}},
      }
    },
  }},

  'Granada':{coords:[37.177,-3.599],zoom:11,municipios:{
    'Granada':{coords:[37.177,-3.599],zoom:13,v:1800,a:9.5,vr:'1.200–3.500',ar:'7–15',note:'',slug:'granada',
      poly:[[37.220,-3.645],[37.220,-3.555],[37.155,-3.548],[37.135,-3.578],[37.148,-3.642],[37.185,-3.658]],
      barrios:{
        'Centro':{coords:[37.177,-3.599],v:2800,a:14,note:'Alta demanda universitaria y turística.',poly:[[37.192,-3.618],[37.192,-3.582],[37.169,-3.578],[37.160,-3.592],[37.165,-3.618],[37.180,-3.626]],subbarrios:{}},
        'Albaicín':{coords:[37.184,-3.591],v:3200,a:15,note:'Zona histórica. Muy demandada pero obra compleja.',poly:[[37.196,-3.602],[37.196,-3.578],[37.180,-3.574],[37.173,-3.583],[37.177,-3.604],[37.190,-3.610]],subbarrios:{}},
        'Zaidín':{coords:[37.157,-3.602],v:1500,a:8,note:'Zona sur. Buena yield.',poly:[[37.172,-3.618],[37.172,-3.585],[37.148,-3.582],[37.138,-3.595],[37.145,-3.618],[37.162,-3.626]],subbarrios:{}},
      }
    },
  }},

  'Valladolid':{coords:[41.652,-4.725],zoom:11,municipios:{
    'Valladolid':{coords:[41.652,-4.725],zoom:13,v:1550,a:8.5,vr:'1.000–2.500',ar:'6,5–11',note:'',slug:'valladolid',
      poly:[[41.700,-4.780],[41.700,-4.672],[41.610,-4.668],[41.595,-4.700],[41.608,-4.778],[41.655,-4.795]],
      barrios:{
        'Centro':{coords:[41.652,-4.725],v:2200,a:11,note:'',poly:[[41.668,-4.744],[41.668,-4.706],[41.640,-4.703],[41.630,-4.718],[41.635,-4.745],[41.655,-4.752]],subbarrios:{}},
        'Parquesol':{coords:[41.666,-4.756],v:1800,a:9,note:'Zona residencial moderna.',poly:[[41.682,-4.775],[41.682,-4.735],[41.658,-4.732],[41.648,-4.748],[41.652,-4.778],[41.670,-4.783]],subbarrios:{}},
      }
    },
  }},

  'Córdoba':{coords:[37.888,-4.779],zoom:11,municipios:{
    'Córdoba':{coords:[37.888,-4.779],zoom:13,v:1450,a:7.5,vr:'900–2.500',ar:'5,5–11',note:'',slug:'cordoba',
      poly:[[37.940,-4.840],[37.940,-4.718],[37.862,-4.712],[37.838,-4.748],[37.852,-4.838],[37.900,-4.858]],
      barrios:{
        'Centro-Casco Histórico':{coords:[37.888,-4.779],v:2200,a:11,note:'Alta demanda turística. Restricciones de reforma.',poly:[[37.902,-4.795],[37.902,-4.762],[37.878,-4.758],[37.868,-4.772],[37.874,-4.797],[37.890,-4.803]],subbarrios:{}},
        'Poniente':{coords:[37.888,-4.810],v:1200,a:6.5,note:'Zona obrera. Precios bajos. Alta yield potencial.',poly:[[37.903,-4.828],[37.903,-4.795],[37.875,-4.792],[37.865,-4.805],[37.872,-4.830],[37.891,-4.836]],subbarrios:{}},
      }
    },
  }},

  'Las Palmas':{coords:[28.125,-15.430],zoom:11,municipios:{
    'Las Palmas de Gran Canaria':{coords:[28.125,-15.430],zoom:13,v:2400,a:12,vr:'1.500–5.000',ar:'9–18',note:'',slug:'las-palmas-de-gran-canaria',
      poly:[[28.175,-15.480],[28.175,-15.375],[28.090,-15.368],[28.065,-15.405],[28.078,-15.478],[28.130,-15.498]],
      barrios:{
        'Triana-Vegueta':{coords:[28.101,-15.415],v:3500,a:16,note:'Casco histórico. Alta demanda.',poly:[[28.115,-15.430],[28.115,-15.400],[28.095,-15.398],[28.086,-15.410],[28.092,-15.432],[28.108,-15.437]],subbarrios:{}},
        'Las Canteras':{coords:[28.134,-15.440],v:3200,a:15,note:'Zona de playa. Alta demanda turística y residencial.',poly:[[28.152,-15.456],[28.152,-15.426],[28.128,-15.423],[28.120,-15.436],[28.126,-15.458],[28.142,-15.463]],subbarrios:{}},
      }
    },
  }},
};
